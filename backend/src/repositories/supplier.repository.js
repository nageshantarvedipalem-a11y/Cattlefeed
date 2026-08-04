import { query, getConnection } from '../../config/database.js';

const SORTABLE_COLUMNS = {
  id: 's.id',
  name: 's.name',
  phone: 's.phone',
  gstNumber: 's.gst_number',
  openingBalance: 's.opening_balance',
  isActive: 's.is_active',
  createdAt: 's.created_at',
  totalPurchases: 'total_purchases',
};

export const formatSupplier = (row) => ({
  id: row.id,
  name: row.name,
  phone: row.phone,
  address: row.address,
  gstNumber: row.gst_number,
  openingBalance: Number(row.opening_balance),
  notes: row.notes,
  isActive: Boolean(row.is_active),
  totalPurchases: Number(row.total_purchases ?? 0),
  totalPurchaseAmount: Number(row.total_purchase_amount ?? 0),
  pendingAmount: Number(row.pending_amount ?? 0),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const findSuppliers = async ({
  search = '',
  isActive = null,
  page = 1,
  limit = 10,
  sortBy = 'createdAt',
  sortOrder = 'desc',
}) => {
  const offset = (page - 1) * limit;
  const sortColumn = SORTABLE_COLUMNS[sortBy] || SORTABLE_COLUMNS.createdAt;
  const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  let whereClause = 'WHERE 1=1';
  const params = [];

  if (search) {
    whereClause += ' AND (s.name LIKE ? OR s.phone LIKE ? OR s.gst_number LIKE ? OR s.address LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }

  if (isActive !== null && isActive !== undefined && isActive !== '') {
    whereClause += ' AND s.is_active = ?';
    params.push(isActive === 'true' || isActive === true || isActive === '1' || isActive === 1 ? 1 : 0);
  }

  const baseFrom = `
    FROM suppliers s
    LEFT JOIN (
      SELECT supplier_id,
             COUNT(*) AS total_purchases,
             COALESCE(SUM(total_amount), 0) AS total_purchase_amount,
             COALESCE(SUM(total_amount - paid_amount), 0) AS pending_amount
      FROM purchases
      GROUP BY supplier_id
    ) ps ON ps.supplier_id = s.id
  `;

  const countRows = await query(
    `SELECT COUNT(*) AS total ${baseFrom} ${whereClause}`,
    params
  );

  const rows = await query(
    `SELECT s.id, s.name, s.phone, s.address, s.gst_number, s.opening_balance,
            s.notes, s.is_active, s.created_at, s.updated_at,
            COALESCE(ps.total_purchases, 0) AS total_purchases,
            COALESCE(ps.total_purchase_amount, 0) AS total_purchase_amount,
            COALESCE(ps.pending_amount, 0) AS pending_amount
     ${baseFrom}
     ${whereClause}
     ORDER BY ${sortColumn} ${order}
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    suppliers: rows.map(formatSupplier),
    total: countRows[0]?.total || 0,
  };
};

export const findSupplierById = async (supplierId) => {
  const rows = await query(
    `SELECT s.id, s.name, s.phone, s.address, s.gst_number, s.opening_balance,
            s.notes, s.is_active, s.created_at, s.updated_at,
            COALESCE(ps.total_purchases, 0) AS total_purchases,
            COALESCE(ps.total_purchase_amount, 0) AS total_purchase_amount,
            COALESCE(ps.pending_amount, 0) AS pending_amount
     FROM suppliers s
     LEFT JOIN (
       SELECT supplier_id,
              COUNT(*) AS total_purchases,
              COALESCE(SUM(total_amount), 0) AS total_purchase_amount,
              COALESCE(SUM(total_amount - paid_amount), 0) AS pending_amount
       FROM purchases GROUP BY supplier_id
     ) ps ON ps.supplier_id = s.id
     WHERE s.id = ?
     LIMIT 1`,
    [supplierId]
  );
  return rows[0] || null;
};

export const findSupplierByName = async (name, excludeId = null) => {
  let sql = 'SELECT id, name FROM suppliers WHERE LOWER(name) = LOWER(?)';
  const params = [name];
  if (excludeId) {
    sql += ' AND id != ?';
    params.push(excludeId);
  }
  sql += ' LIMIT 1';
  const rows = await query(sql, params);
  return rows[0] || null;
};

export const createSupplierRecord = async (connection, data) => {
  const [result] = await connection.execute(
    `INSERT INTO suppliers (name, phone, address, gst_number, opening_balance, notes, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      data.name,
      data.phone || null,
      data.address || null,
      data.gstNumber || null,
      data.openingBalance,
      data.notes || null,
      data.isActive ? 1 : 0,
    ]
  );
  return result.insertId;
};

export const updateSupplierRecord = async (connection, supplierId, data) => {
  const fields = [];
  const values = [];

  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.phone !== undefined) { fields.push('phone = ?'); values.push(data.phone || null); }
  if (data.address !== undefined) { fields.push('address = ?'); values.push(data.address || null); }
  if (data.gstNumber !== undefined) { fields.push('gst_number = ?'); values.push(data.gstNumber || null); }
  if (data.openingBalance !== undefined) { fields.push('opening_balance = ?'); values.push(data.openingBalance); }
  if (data.notes !== undefined) { fields.push('notes = ?'); values.push(data.notes || null); }
  if (data.isActive !== undefined) { fields.push('is_active = ?'); values.push(data.isActive ? 1 : 0); }

  if (fields.length === 0) return;

  fields.push('updated_at = NOW()');
  values.push(supplierId);

  await connection.execute(
    `UPDATE suppliers SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
};

export const deleteSupplierRecord = async (supplierId) => {
  await query('DELETE FROM suppliers WHERE id = ?', [supplierId]);
};

export const countSupplierPurchases = async (supplierId) => {
  const rows = await query(
    'SELECT COUNT(*) AS total FROM purchases WHERE supplier_id = ?',
    [supplierId]
  );
  return rows[0]?.total || 0;
};

export const findSupplierPurchases = async (supplierId, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;

  const countRows = await query(
    'SELECT COUNT(*) AS total FROM purchases WHERE supplier_id = ?',
    [supplierId]
  );

  const rows = await query(
    `SELECT id, invoice_number, purchase_date, subtotal, tax_amount, discount_amount,
            total_amount, paid_amount, payment_status, remarks, created_at
     FROM purchases
     WHERE supplier_id = ?
     ORDER BY purchase_date DESC, id DESC
     LIMIT ? OFFSET ?`,
    [supplierId, limit, offset]
  );

  return {
    purchases: rows.map((p) => ({
      id: p.id,
      invoiceNumber: p.invoice_number,
      purchaseDate: p.purchase_date,
      subtotal: Number(p.subtotal),
      taxAmount: Number(p.tax_amount),
      discountAmount: Number(p.discount_amount),
      totalAmount: Number(p.total_amount),
      paidAmount: Number(p.paid_amount),
      pendingAmount: Number(p.total_amount) - Number(p.paid_amount),
      paymentStatus: p.payment_status,
      remarks: p.remarks,
      createdAt: p.created_at,
    })),
    total: countRows[0]?.total || 0,
  };
};

export { getConnection };
