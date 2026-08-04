import { query, getConnection } from '../../config/database.js';

const SORTABLE_COLUMNS = {
  id: 'p.id',
  invoiceNumber: 'p.invoice_number',
  purchaseDate: 'p.purchase_date',
  totalAmount: 'p.total_amount',
  paidAmount: 'p.paid_amount',
  paymentStatus: 'p.payment_status',
  createdAt: 'p.created_at',
  supplierName: 's.name',
};

export const formatPurchaseItem = (row) => ({
  id: row.id,
  productId: row.product_id,
  productName: row.product_name,
  productSku: row.product_sku,
  quantity: Number(row.quantity),
  purchasePrice: Number(row.purchase_price),
  sellingPrice: Number(row.selling_price),
  gstRate: Number(row.gst_rate),
  taxAmount: Number(row.tax_amount),
  totalAmount: Number(row.total_amount),
});

export const formatPurchase = (row, items = []) => ({
  id: row.id,
  supplierId: row.supplier_id,
  supplierName: row.supplier_name,
  invoiceNumber: row.invoice_number,
  purchaseDate: row.purchase_date,
  subtotal: Number(row.subtotal),
  taxAmount: Number(row.tax_amount),
  discountAmount: Number(row.discount_amount),
  totalAmount: Number(row.total_amount),
  paidAmount: Number(row.paid_amount),
  pendingAmount: Number(row.total_amount) - Number(row.paid_amount),
  paymentStatus: row.payment_status,
  remarks: row.remarks,
  createdBy: row.created_by,
  createdByName: row.created_by_name || null,
  itemCount: Number(row.item_count ?? items.length),
  items: items.map(formatPurchaseItem),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const purchaseSelect = `
  SELECT p.id, p.supplier_id, s.name AS supplier_name, p.invoice_number,
         p.purchase_date, p.subtotal, p.tax_amount, p.discount_amount,
         p.total_amount, p.paid_amount, p.payment_status, p.remarks,
         p.created_by, u.full_name AS created_by_name,
         p.created_at, p.updated_at,
         (SELECT COUNT(*) FROM purchase_items pi WHERE pi.purchase_id = p.id) AS item_count
  FROM purchases p
  INNER JOIN suppliers s ON s.id = p.supplier_id
  LEFT JOIN users u ON u.id = p.created_by
`;

export const findPurchases = async ({
  search = '',
  supplierId = null,
  paymentStatus = null,
  dateFrom = null,
  dateTo = null,
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
    whereClause += ' AND (p.invoice_number LIKE ? OR s.name LIKE ? OR p.remarks LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  if (supplierId) {
    whereClause += ' AND p.supplier_id = ?';
    params.push(supplierId);
  }

  if (paymentStatus) {
    whereClause += ' AND p.payment_status = ?';
    params.push(paymentStatus);
  }

  if (dateFrom && dateTo) {
    whereClause += ' AND p.purchase_date BETWEEN ? AND ?';
    params.push(dateFrom, dateTo);
  }

  const countRows = await query(
    `SELECT COUNT(*) AS total FROM purchases p INNER JOIN suppliers s ON s.id = p.supplier_id ${whereClause}`,
    params
  );

  const rows = await query(
    `${purchaseSelect}
     ${whereClause}
     ORDER BY ${sortColumn} ${order}
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    purchases: rows.map((row) => formatPurchase(row)),
    total: countRows[0]?.total || 0,
  };
};

export const findPurchaseById = async (purchaseId) => {
  const rows = await query(
    `${purchaseSelect} WHERE p.id = ? LIMIT 1`,
    [purchaseId]
  );
  return rows[0] || null;
};

export const findPurchaseItems = async (purchaseId) => {
  const rows = await query(
    `SELECT pi.id, pi.product_id, pr.name AS product_name, pr.sku AS product_sku,
            pi.quantity, pi.purchase_price, pi.selling_price, pi.gst_rate,
            pi.tax_amount, pi.total_amount
     FROM purchase_items pi
     INNER JOIN products pr ON pr.id = pi.product_id
     WHERE pi.purchase_id = ?
     ORDER BY pi.id ASC`,
    [purchaseId]
  );
  return rows;
};

export const findPurchaseByInvoiceNumber = async (invoiceNumber, excludeId = null) => {
  let sql = 'SELECT id, invoice_number FROM purchases WHERE LOWER(invoice_number) = LOWER(?)';
  const params = [invoiceNumber];
  if (excludeId) {
    sql += ' AND id != ?';
    params.push(excludeId);
  }
  sql += ' LIMIT 1';
  const rows = await query(sql, params);
  return rows[0] || null;
};

export const createPurchaseRecord = async (connection, data) => {
  const [result] = await connection.execute(
    `INSERT INTO purchases (
       supplier_id, invoice_number, purchase_date, subtotal, tax_amount,
       discount_amount, total_amount, paid_amount, payment_status, remarks, created_by
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.supplierId,
      data.invoiceNumber,
      data.purchaseDate,
      data.subtotal,
      data.taxAmount,
      data.discountAmount,
      data.totalAmount,
      data.paidAmount,
      data.paymentStatus,
      data.remarks || null,
      data.createdBy,
    ]
  );
  return result.insertId;
};

export const createPurchaseItemRecord = async (connection, data) => {
  const [result] = await connection.execute(
    `INSERT INTO purchase_items (
       purchase_id, product_id, quantity, purchase_price, selling_price,
       gst_rate, tax_amount, total_amount
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.purchaseId,
      data.productId,
      data.quantity,
      data.purchasePrice,
      data.sellingPrice,
      data.gstRate,
      data.taxAmount,
      data.totalAmount,
    ]
  );
  return result.insertId;
};

export { getConnection };
