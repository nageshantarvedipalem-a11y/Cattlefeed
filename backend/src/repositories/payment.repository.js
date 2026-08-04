import { query, getConnection } from '../../config/database.js';

export const formatPayment = (row) => ({
  id: row.id,
  customerId: row.customer_id,
  customerName: row.customer_name || null,
  customerPhone: row.customer_phone || null,
  saleId: row.sale_id,
  invoiceNumber: row.invoice_number || null,
  paymentDate: row.payment_date,
  amount: Number(row.amount),
  paymentMethod: row.payment_method,
  referenceNumber: row.reference_number,
  remarks: row.remarks,
  createdByName: row.created_by_name || null,
  createdAt: row.created_at,
});

export const formatPendingSale = (row) => ({
  id: row.id,
  invoiceNumber: row.invoice_number,
  customerId: row.customer_id,
  customerName: row.customer_name,
  customerPhone: row.customer_phone,
  customerVillage: row.customer_village || null,
  saleDate: row.sale_date,
  totalAmount: Number(row.total_amount),
  paidAmount: Number(row.paid_amount),
  pendingAmount: Number(row.pending_amount),
  paymentStatus: row.payment_status,
  dueDate: row.due_date,
  isOverdue: row.due_date ? new Date(row.due_date) < new Date(new Date().toISOString().slice(0, 10)) : false,
});

const paymentSelect = `
  SELECT p.id, p.customer_id, c.name AS customer_name, c.phone AS customer_phone,
         p.sale_id, s.invoice_number, p.payment_date, p.amount, p.payment_method,
         p.reference_number, p.remarks, u.full_name AS created_by_name, p.created_at
  FROM payments p
  INNER JOIN customers c ON c.id = p.customer_id
  LEFT JOIN sales s ON s.id = p.sale_id
  LEFT JOIN users u ON u.id = p.created_by
`;

export const findPendingSales = async ({
  search = '',
  customerId = null,
  overdueOnly = false,
  period = null,
  dateFrom = null,
  dateTo = null,
  page = 1,
  limit = 10,
  sortBy = 'dueDate',
  sortOrder = 'asc',
}) => {
  const offset = (page - 1) * limit;
  const sortMap = {
    dueDate: 's.due_date',
    pendingAmount: 's.pending_amount',
    saleDate: 's.sale_date',
    customerName: 'c.name',
    invoiceNumber: 's.invoice_number',
  };
  const sortColumn = sortMap[sortBy] || sortMap.dueDate;
  const order = sortOrder.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

  let whereClause = 'WHERE s.pending_amount > 0 AND s.customer_id IS NOT NULL';
  const params = [];

  if (search) {
    whereClause += ' AND (s.invoice_number LIKE ? OR c.name LIKE ? OR c.phone LIKE ? OR c.village LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }

  if (customerId) {
    whereClause += ' AND s.customer_id = ?';
    params.push(customerId);
  }

  if (overdueOnly) {
    whereClause += ' AND s.due_date IS NOT NULL AND s.due_date < CURDATE()';
  }

  if (dateFrom && dateTo) {
    whereClause += ' AND DATE(s.sale_date) BETWEEN ? AND ?';
    params.push(dateFrom, dateTo);
  } else if (period === 'daily') {
    whereClause += ' AND DATE(s.sale_date) = CURDATE()';
  } else if (period === 'monthly') {
    whereClause += ' AND YEAR(s.sale_date) = YEAR(CURDATE()) AND MONTH(s.sale_date) = MONTH(CURDATE())';
  } else if (period === 'yearly') {
    whereClause += ' AND YEAR(s.sale_date) = YEAR(CURDATE())';
  }

  const baseFrom = `
    FROM sales s
    INNER JOIN customers c ON c.id = s.customer_id
  `;

  const countRows = await query(`SELECT COUNT(*) AS total ${baseFrom} ${whereClause}`, params);

  const rows = await query(
    `SELECT s.id, s.invoice_number, s.customer_id, c.name AS customer_name, c.phone AS customer_phone,
            c.village AS customer_village, s.sale_date, s.total_amount, s.paid_amount,
            s.pending_amount, s.payment_status, s.due_date
     ${baseFrom}
     ${whereClause}
     ORDER BY ${sortColumn} IS NULL, ${sortColumn} ${order}, s.id DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    pendingSales: rows.map(formatPendingSale),
    total: countRows[0]?.total || 0,
  };
};

export const findPendingSalesForExport = async (filters) => {
  const { pendingSales } = await findPendingSales({ ...filters, page: 1, limit: 10000 });
  return pendingSales;
};

export const getPendingPaymentsSummary = async (filters = {}) => {
  let whereClause = 'WHERE s.pending_amount > 0 AND s.customer_id IS NOT NULL';
  const params = [];

  if (filters.search) {
    whereClause += ' AND (s.invoice_number LIKE ? OR c.name LIKE ? OR c.phone LIKE ?)';
    const term = `%${filters.search}%`;
    params.push(term, term, term);
  }

  if (filters.customerId) {
    whereClause += ' AND s.customer_id = ?';
    params.push(filters.customerId);
  }

  const rows = await query(
    `SELECT
       COUNT(*) AS total_invoices,
       COALESCE(SUM(s.pending_amount), 0) AS total_pending,
       COALESCE(SUM(CASE WHEN s.due_date IS NOT NULL AND s.due_date < CURDATE() THEN s.pending_amount ELSE 0 END), 0) AS overdue_amount,
       COUNT(CASE WHEN s.due_date IS NOT NULL AND s.due_date < CURDATE() THEN 1 END) AS overdue_count
     FROM sales s
     INNER JOIN customers c ON c.id = s.customer_id
     ${whereClause}`,
    params
  );

  return {
    totalInvoices: Number(rows[0]?.total_invoices ?? 0),
    totalPending: Number(rows[0]?.total_pending ?? 0),
    overdueAmount: Number(rows[0]?.overdue_amount ?? 0),
    overdueCount: Number(rows[0]?.overdue_count ?? 0),
  };
};

export const findPayments = async ({
  search = '',
  customerId = null,
  saleId = null,
  period = null,
  dateFrom = null,
  dateTo = null,
  page = 1,
  limit = 10,
  sortOrder = 'desc',
}) => {
  const offset = (page - 1) * limit;
  const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  let whereClause = 'WHERE 1=1';
  const params = [];

  if (search) {
    whereClause += ' AND (c.name LIKE ? OR c.phone LIKE ? OR s.invoice_number LIKE ? OR p.reference_number LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }

  if (customerId) {
    whereClause += ' AND p.customer_id = ?';
    params.push(customerId);
  }

  if (saleId) {
    whereClause += ' AND p.sale_id = ?';
    params.push(saleId);
  }

  if (dateFrom && dateTo) {
    whereClause += ' AND p.payment_date BETWEEN ? AND ?';
    params.push(dateFrom, dateTo);
  } else if (period === 'daily') {
    whereClause += ' AND p.payment_date = CURDATE()';
  } else if (period === 'monthly') {
    whereClause += ' AND YEAR(p.payment_date) = YEAR(CURDATE()) AND MONTH(p.payment_date) = MONTH(CURDATE())';
  } else if (period === 'yearly') {
    whereClause += ' AND YEAR(p.payment_date) = YEAR(CURDATE())';
  }

  const countRows = await query(`SELECT COUNT(*) AS total FROM payments p INNER JOIN customers c ON c.id = p.customer_id LEFT JOIN sales s ON s.id = p.sale_id ${whereClause}`, params);

  const rows = await query(
    `${paymentSelect} ${whereClause} ORDER BY p.payment_date ${order}, p.id ${order} LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    payments: rows.map(formatPayment),
    total: countRows[0]?.total || 0,
  };
};

export const findPaymentById = async (paymentId) => {
  const rows = await query(`${paymentSelect} WHERE p.id = ? LIMIT 1`, [paymentId]);
  return rows[0] ? formatPayment(rows[0]) : null;
};

export const createPaymentRecord = async (connection, data) => {
  const [result] = await connection.execute(
    `INSERT INTO payments (
       customer_id, sale_id, payment_date, amount, payment_method,
       reference_number, remarks, created_by
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.customerId,
      data.saleId || null,
      data.paymentDate,
      data.amount,
      data.paymentMethod,
      data.referenceNumber || null,
      data.remarks || null,
      data.createdBy,
    ]
  );
  return result.insertId;
};

export { getConnection };
