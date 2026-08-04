import { query, getConnection } from '../../config/database.js';

const SORTABLE_COLUMNS = {
  id: 'c.id',
  name: 'c.name',
  phone: 'c.phone',
  village: 'c.village',
  openingBalance: 'c.opening_balance',
  creditLimit: 'c.credit_limit',
  isActive: 'c.is_active',
  createdAt: 'c.created_at',
  currentBalance: 'current_balance',
};

export const formatCustomer = (row) => ({
  id: row.id,
  name: row.name,
  phone: row.phone,
  village: row.village,
  address: row.address,
  openingBalance: Number(row.opening_balance),
  openingBalanceType: row.opening_balance_type,
  creditLimit: Number(row.credit_limit),
  notes: row.notes,
  isActive: Boolean(row.is_active),
  currentBalance: Number(row.current_balance ?? 0),
  totalSales: Number(row.total_sales ?? 0),
  pendingAmount: Number(row.pending_amount ?? 0),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const findCustomers = async ({
  search = '',
  village = '',
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
    whereClause += ' AND (c.name LIKE ? OR c.phone LIKE ? OR c.village LIKE ? OR c.address LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }

  if (village) {
    whereClause += ' AND c.village = ?';
    params.push(village);
  }

  if (isActive !== null && isActive !== undefined && isActive !== '') {
    whereClause += ' AND c.is_active = ?';
    params.push(isActive === 'true' || isActive === true || isActive === '1' || isActive === 1 ? 1 : 0);
  }

  const baseFrom = `
    FROM customers c
    LEFT JOIN (
      SELECT cl.customer_id, cl.balance AS current_balance
      FROM customer_ledger cl
      INNER JOIN (
        SELECT customer_id, MAX(id) AS max_id
        FROM customer_ledger
        GROUP BY customer_id
      ) latest ON latest.max_id = cl.id
    ) lb ON lb.customer_id = c.id
    LEFT JOIN (
      SELECT customer_id, COUNT(*) AS total_sales, COALESCE(SUM(pending_amount), 0) AS pending_amount
      FROM sales
      WHERE customer_id IS NOT NULL
      GROUP BY customer_id
    ) ss ON ss.customer_id = c.id
  `;

  const countRows = await query(
    `SELECT COUNT(*) AS total ${baseFrom} ${whereClause}`,
    params
  );

  const rows = await query(
    `SELECT c.id, c.name, c.phone, c.village, c.address, c.opening_balance,
            c.opening_balance_type, c.credit_limit, c.notes, c.is_active,
            c.created_at, c.updated_at,
            COALESCE(lb.current_balance, 0) AS current_balance,
            COALESCE(ss.total_sales, 0) AS total_sales,
            COALESCE(ss.pending_amount, 0) AS pending_amount
     ${baseFrom}
     ${whereClause}
     ORDER BY ${sortColumn} ${order}
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    customers: rows.map(formatCustomer),
    total: countRows[0]?.total || 0,
  };
};

export const findCustomerById = async (customerId) => {
  const rows = await query(
    `SELECT c.id, c.name, c.phone, c.village, c.address, c.opening_balance,
            c.opening_balance_type, c.credit_limit, c.notes, c.is_active,
            c.created_at, c.updated_at,
            COALESCE(lb.current_balance, 0) AS current_balance,
            COALESCE(ss.total_sales, 0) AS total_sales,
            COALESCE(ss.pending_amount, 0) AS pending_amount
     FROM customers c
     LEFT JOIN (
       SELECT cl.customer_id, cl.balance AS current_balance
       FROM customer_ledger cl
       INNER JOIN (
         SELECT customer_id, MAX(id) AS max_id FROM customer_ledger GROUP BY customer_id
       ) latest ON latest.max_id = cl.id
     ) lb ON lb.customer_id = c.id
     LEFT JOIN (
       SELECT customer_id, COUNT(*) AS total_sales, COALESCE(SUM(pending_amount), 0) AS pending_amount
       FROM sales WHERE customer_id IS NOT NULL GROUP BY customer_id
     ) ss ON ss.customer_id = c.id
     WHERE c.id = ?
     LIMIT 1`,
    [customerId]
  );
  return rows[0] || null;
};

export const findCustomerByPhone = async (phone, excludeId = null) => {
  let sql = 'SELECT id, phone FROM customers WHERE phone = ?';
  const params = [phone];
  if (excludeId) {
    sql += ' AND id != ?';
    params.push(excludeId);
  }
  sql += ' LIMIT 1';
  const rows = await query(sql, params);
  return rows[0] || null;
};

export const findDistinctVillages = async () => {
  const rows = await query(
    `SELECT DISTINCT village FROM customers
     WHERE village IS NOT NULL AND village != ''
     ORDER BY village ASC`
  );
  return rows.map((r) => r.village);
};

export const createCustomerRecord = async (connection, data) => {
  const [result] = await connection.execute(
    `INSERT INTO customers (name, phone, village, address, opening_balance, opening_balance_type, credit_limit, notes, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.name,
      data.phone,
      data.village || null,
      data.address || null,
      data.openingBalance,
      data.openingBalanceType,
      data.creditLimit,
      data.notes || null,
      data.isActive ? 1 : 0,
    ]
  );
  return result.insertId;
};

export const updateCustomerRecord = async (connection, customerId, data) => {
  const fields = [];
  const values = [];

  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.phone !== undefined) { fields.push('phone = ?'); values.push(data.phone); }
  if (data.village !== undefined) { fields.push('village = ?'); values.push(data.village || null); }
  if (data.address !== undefined) { fields.push('address = ?'); values.push(data.address || null); }
  if (data.openingBalance !== undefined) { fields.push('opening_balance = ?'); values.push(data.openingBalance); }
  if (data.openingBalanceType !== undefined) { fields.push('opening_balance_type = ?'); values.push(data.openingBalanceType); }
  if (data.creditLimit !== undefined) { fields.push('credit_limit = ?'); values.push(data.creditLimit); }
  if (data.notes !== undefined) { fields.push('notes = ?'); values.push(data.notes || null); }
  if (data.isActive !== undefined) { fields.push('is_active = ?'); values.push(data.isActive ? 1 : 0); }

  if (fields.length === 0) return;

  fields.push('updated_at = NOW()');
  values.push(customerId);

  await connection.execute(
    `UPDATE customers SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
};

export const deleteCustomerRecord = async (customerId) => {
  await query('DELETE FROM customers WHERE id = ?', [customerId]);
};

export const countCustomerReferences = async (customerId) => {
  const [sales] = await query(
    'SELECT COUNT(*) AS total FROM sales WHERE customer_id = ?',
    [customerId]
  );
  const [payments] = await query(
    'SELECT COUNT(*) AS total FROM payments WHERE customer_id = ?',
    [customerId]
  );
  return (sales?.total || 0) + (payments?.total || 0);
};

export const findCustomerSales = async (customerId, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;

  const countRows = await query(
    'SELECT COUNT(*) AS total FROM sales WHERE customer_id = ?',
    [customerId]
  );

  const rows = await query(
    `SELECT id, invoice_number, sale_date, total_amount, paid_amount, pending_amount, payment_status
     FROM sales
     WHERE customer_id = ?
     ORDER BY sale_date DESC
     LIMIT ? OFFSET ?`,
    [customerId, limit, offset]
  );

  return {
    sales: rows.map((s) => ({
      id: s.id,
      invoiceNumber: s.invoice_number,
      saleDate: s.sale_date,
      totalAmount: Number(s.total_amount),
      paidAmount: Number(s.paid_amount),
      pendingAmount: Number(s.pending_amount),
      paymentStatus: s.payment_status,
    })),
    total: countRows[0]?.total || 0,
  };
};

export const findCustomerLedger = async (customerId, page = 1, limit = 10) => {
  const offset = (page - 1) * limit;

  const countRows = await query(
    'SELECT COUNT(*) AS total FROM customer_ledger WHERE customer_id = ?',
    [customerId]
  );

  const rows = await query(
    `SELECT id, transaction_date, transaction_type, reference_type, reference_id,
            debit, credit, balance, remarks
     FROM customer_ledger
     WHERE customer_id = ?
     ORDER BY transaction_date DESC, id DESC
     LIMIT ? OFFSET ?`,
    [customerId, limit, offset]
  );

  return {
    ledger: rows.map((l) => ({
      id: l.id,
      transactionDate: l.transaction_date,
      transactionType: l.transaction_type,
      referenceType: l.reference_type,
      referenceId: l.reference_id,
      debit: Number(l.debit),
      credit: Number(l.credit),
      balance: Number(l.balance),
      remarks: l.remarks,
    })),
    total: countRows[0]?.total || 0,
  };
};

export const findPendingPayments = async (customerId) => {
  const rows = await query(
    `SELECT id, invoice_number, sale_date, total_amount, paid_amount, pending_amount, due_date, payment_status
     FROM sales
     WHERE customer_id = ? AND pending_amount > 0
     ORDER BY sale_date DESC`,
    [customerId]
  );

  return rows.map((s) => ({
    id: s.id,
    invoiceNumber: s.invoice_number,
    saleDate: s.sale_date,
    totalAmount: Number(s.total_amount),
    paidAmount: Number(s.paid_amount),
    pendingAmount: Number(s.pending_amount),
    dueDate: s.due_date,
    paymentStatus: s.payment_status,
  }));
};

export { getConnection };
