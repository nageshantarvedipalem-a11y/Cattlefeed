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
  customerPendingTotal: Number(row.customer_pending_total ?? row.pending_amount ?? 0),
  paymentStatus: row.payment_status,
  dueDate: row.due_date,
  isOverdue: row.due_date ? new Date(row.due_date) < new Date(new Date().toISOString().slice(0, 10)) : false,
});

export const formatPendingCustomer = (row) => ({
  customerId: row.customer_id,
  customerName: row.customer_name,
  customerPhone: row.customer_phone,
  customerVillage: row.customer_village || null,
  invoiceCount: Number(row.invoice_count || 0),
  totalAmount: Number(row.total_amount),
  paidAmount: Number(row.paid_amount),
  pendingAmount: Number(row.pending_amount),
  firstSaleDate: row.first_sale_date,
  lastSaleDate: row.last_sale_date,
  earliestDueDate: row.earliest_due_date,
  overdueCount: Number(row.overdue_count || 0),
  overdueAmount: Number(row.overdue_amount || 0),
  isOverdue: Number(row.overdue_count || 0) > 0,
  paymentStatus: Number(row.paid_amount) > 0 ? 'partial' : 'pending',
  customerPendingTotal: Number(row.pending_amount),
});

const appendCustomerGroupFilters = (whereClause, params, {
  search = '',
  customerId = null,
  overdueOnly = false,
  period = null,
  dateFrom = null,
  dateTo = null,
}) => {
  if (customerId) {
    whereClause += ' AND s.customer_id = ?';
    params.push(customerId);
  }

  if (search) {
    whereClause += ` AND s.customer_id IN (
      SELECT DISTINCT s1.customer_id
      FROM sales s1
      INNER JOIN customers c1 ON c1.id = s1.customer_id
      WHERE s1.pending_amount > 0
        AND (s1.invoice_number LIKE ? OR c1.name LIKE ? OR c1.phone LIKE ? OR c1.village LIKE ?)
    )`;
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }

  if (overdueOnly) {
    whereClause += ` AND s.customer_id IN (
      SELECT DISTINCT s2.customer_id
      FROM sales s2
      WHERE s2.pending_amount > 0
        AND s2.due_date IS NOT NULL
        AND s2.due_date < CURDATE()
    )`;
  }

  if (dateFrom && dateTo) {
    whereClause += ` AND s.customer_id IN (
      SELECT DISTINCT s3.customer_id
      FROM sales s3
      WHERE s3.pending_amount > 0 AND DATE(s3.sale_date) BETWEEN ? AND ?
    )`;
    params.push(dateFrom, dateTo);
  } else if (period === 'daily') {
    whereClause += ` AND s.customer_id IN (
      SELECT DISTINCT s3.customer_id
      FROM sales s3
      WHERE s3.pending_amount > 0 AND DATE(s3.sale_date) = CURDATE()
    )`;
  } else if (period === 'monthly') {
    whereClause += ` AND s.customer_id IN (
      SELECT DISTINCT s3.customer_id
      FROM sales s3
      WHERE s3.pending_amount > 0
        AND YEAR(s3.sale_date) = YEAR(CURDATE())
        AND MONTH(s3.sale_date) = MONTH(CURDATE())
    )`;
  } else if (period === 'yearly') {
    whereClause += ` AND s.customer_id IN (
      SELECT DISTINCT s3.customer_id
      FROM sales s3
      WHERE s3.pending_amount > 0 AND YEAR(s3.sale_date) = YEAR(CURDATE())
    )`;
  }

  return { whereClause, params };
};

export const findPendingCustomers = async ({
  search = '',
  customerId = null,
  overdueOnly = false,
  period = null,
  dateFrom = null,
  dateTo = null,
  page = 1,
  limit = 10,
  sortBy = 'lastSaleDate',
  sortOrder = 'desc',
}) => {
  const offset = (page - 1) * limit;
  const sortMap = {
    lastSaleDate: 'last_sale_date',
    pendingAmount: 'pending_amount',
    customerName: 'customer_name',
    invoiceCount: 'invoice_count',
    totalAmount: 'total_amount',
  };
  const sortColumn = sortMap[sortBy] || sortMap.lastSaleDate;
  const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const filtered = appendCustomerGroupFilters(
    'WHERE s.pending_amount > 0 AND s.customer_id IS NOT NULL',
    [],
    { search, customerId, overdueOnly, period, dateFrom, dateTo }
  );

  const groupedFrom = `
    FROM sales s
    INNER JOIN customers c ON c.id = s.customer_id
    ${filtered.whereClause}
    GROUP BY s.customer_id, c.name, c.phone, c.village
  `;

  const countRows = await query(
    `SELECT COUNT(*) AS total FROM (SELECT s.customer_id ${groupedFrom}) grouped`,
    filtered.params
  );

  const rows = await query(
    `SELECT
       s.customer_id,
       c.name AS customer_name,
       c.phone AS customer_phone,
       c.village AS customer_village,
       COUNT(*) AS invoice_count,
       COALESCE(SUM(s.total_amount), 0) AS total_amount,
       COALESCE(SUM(s.paid_amount), 0) AS paid_amount,
       COALESCE(SUM(s.pending_amount), 0) AS pending_amount,
       MIN(s.sale_date) AS first_sale_date,
       MAX(s.sale_date) AS last_sale_date,
       MIN(s.due_date) AS earliest_due_date,
       SUM(CASE WHEN s.due_date IS NOT NULL AND s.due_date < CURDATE() THEN 1 ELSE 0 END) AS overdue_count,
       COALESCE(SUM(CASE WHEN s.due_date IS NOT NULL AND s.due_date < CURDATE() THEN s.pending_amount ELSE 0 END), 0) AS overdue_amount
     ${groupedFrom}
     ORDER BY ${sortColumn} ${order}, s.customer_id DESC
     LIMIT ? OFFSET ?`,
    [...filtered.params, limit, offset]
  );

  return {
    pendingCustomers: rows.map(formatPendingCustomer),
    total: Number(countRows[0]?.total || 0),
  };
};

export const findPendingCustomerById = async (customerId) => {
  const { pendingCustomers } = await findPendingCustomers({
    customerId,
    page: 1,
    limit: 1,
  });
  return pendingCustomers[0] || null;
};

export const findCustomerPaymentInvoices = async (customerId) => {
  const rows = await query(
    `SELECT s.id, s.invoice_number, s.customer_id, c.name AS customer_name, c.phone AS customer_phone,
            c.village AS customer_village, s.sale_date, s.total_amount, s.paid_amount,
            s.pending_amount, s.payment_status, s.due_date,
            (
              SELECT COALESCE(SUM(s2.pending_amount), 0)
              FROM sales s2
              WHERE s2.customer_id = s.customer_id AND s2.pending_amount > 0
            ) AS customer_pending_total
     FROM sales s
     INNER JOIN customers c ON c.id = s.customer_id
     WHERE s.customer_id = ?
     ORDER BY s.sale_date DESC, s.id DESC
     LIMIT 200`,
    [customerId]
  );

  return rows.map(formatPendingSale);
};

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
            s.pending_amount, s.payment_status, s.due_date,
            (
              SELECT COALESCE(SUM(s2.pending_amount), 0)
              FROM sales s2
              WHERE s2.customer_id = s.customer_id AND s2.pending_amount > 0
            ) AS customer_pending_total
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
       COUNT(DISTINCT s.customer_id) AS total_customers,
       COALESCE(SUM(s.pending_amount), 0) AS total_pending,
       COALESCE(SUM(CASE WHEN s.due_date IS NOT NULL AND s.due_date < CURDATE() THEN s.pending_amount ELSE 0 END), 0) AS overdue_amount,
       COUNT(CASE WHEN s.due_date IS NOT NULL AND s.due_date < CURDATE() THEN 1 END) AS overdue_count
     FROM sales s
     INNER JOIN customers c ON c.id = s.customer_id
     ${whereClause}`,
    params
  );

  return {
    totalCustomers: Number(rows[0]?.total_customers ?? 0),
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
