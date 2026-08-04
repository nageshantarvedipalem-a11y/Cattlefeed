import { query, getConnection } from '../../config/database.js';

const INFLOW_TYPES = ['cash_in', 'income'];
const OUTFLOW_TYPES = ['cash_out', 'expense', 'transfer'];

export const formatCashBookEntry = (row) => ({
  id: row.id,
  transactionDate: row.transaction_date,
  transactionType: row.transaction_type,
  category: row.category,
  amount: Number(row.amount),
  paymentMethod: row.payment_method,
  referenceType: row.reference_type,
  referenceId: row.reference_id,
  balanceAfter: Number(row.balance_after),
  remarks: row.remarks,
  createdByName: row.created_by_name || null,
  createdAt: row.created_at,
});

const buildDateFilter = (period, dateFrom, dateTo) => {
  if (dateFrom && dateTo) {
    return { clause: ' AND cb.transaction_date BETWEEN ? AND ?', params: [dateFrom, dateTo] };
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const today = `${year}-${month}-${day}`;

  switch (period) {
    case 'daily':
      return { clause: ' AND cb.transaction_date = ?', params: [today] };
    case 'monthly':
      return { clause: ' AND YEAR(cb.transaction_date) = ? AND MONTH(cb.transaction_date) = ?', params: [year, now.getMonth() + 1] };
    case 'yearly':
      return { clause: ' AND YEAR(cb.transaction_date) = ?', params: [year] };
    default:
      return { clause: '', params: [] };
  }
};

export const getLatestCashBalance = async (connection = null) => {
  const sql = 'SELECT balance_after FROM cash_book ORDER BY id DESC LIMIT 1';
  if (connection) {
    const [rows] = await connection.execute(sql);
    return Number(rows[0]?.balance_after ?? 0);
  }
  const rows = await query(sql);
  return Number(rows[0]?.balance_after ?? 0);
};

export const createCashBookEntry = async (connection, data) => {
  const [result] = await connection.execute(
    `INSERT INTO cash_book (
       transaction_date, transaction_type, category, amount, payment_method,
       reference_type, reference_id, balance_after, remarks, created_by
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.transactionDate,
      data.transactionType,
      data.category || null,
      data.amount,
      data.paymentMethod,
      data.referenceType || null,
      data.referenceId || null,
      data.balanceAfter,
      data.remarks || null,
      data.createdBy,
    ]
  );
  return result.insertId;
};

export const findCashBookEntries = async ({
  search = '',
  transactionType = null,
  paymentMethod = null,
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
    whereClause += ' AND (cb.category LIKE ? OR cb.remarks LIKE ? OR cb.reference_type LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  if (transactionType) {
    whereClause += ' AND cb.transaction_type = ?';
    params.push(transactionType);
  }

  if (paymentMethod) {
    whereClause += ' AND cb.payment_method = ?';
    params.push(paymentMethod);
  }

  const dateFilter = buildDateFilter(period, dateFrom, dateTo);
  whereClause += dateFilter.clause;
  params.push(...dateFilter.params);

  const baseFrom = `
    FROM cash_book cb
    LEFT JOIN users u ON u.id = cb.created_by
  `;

  const countRows = await query(`SELECT COUNT(*) AS total ${baseFrom} ${whereClause}`, params);

  const rows = await query(
    `SELECT cb.id, cb.transaction_date, cb.transaction_type, cb.category, cb.amount,
            cb.payment_method, cb.reference_type, cb.reference_id, cb.balance_after,
            cb.remarks, u.full_name AS created_by_name, cb.created_at
     ${baseFrom}
     ${whereClause}
     ORDER BY cb.transaction_date ${order}, cb.id ${order}
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    entries: rows.map(formatCashBookEntry),
    total: countRows[0]?.total || 0,
  };
};

export const findCashBookEntriesForExport = async (filters) => {
  const { entries } = await findCashBookEntries({ ...filters, page: 1, limit: 10000 });
  return entries;
};

export const getCashBookPeriodSummary = async ({ period, dateFrom, dateTo } = {}) => {
  let periodStart = null;
  let periodEnd = null;

  if (dateFrom && dateTo) {
    periodStart = dateFrom;
    periodEnd = dateTo;
  } else {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const today = `${year}-${month}-${day}`;

    switch (period) {
      case 'daily':
        periodStart = today;
        periodEnd = today;
        break;
      case 'monthly':
        periodStart = `${year}-${month}-01`;
        periodEnd = today;
        break;
      case 'yearly':
        periodStart = `${year}-01-01`;
        periodEnd = today;
        break;
      default:
        break;
    }
  }

  let openingBalance = 0;
  if (periodStart) {
    const openingRows = await query(
      `SELECT balance_after FROM cash_book
       WHERE transaction_date < ?
       ORDER BY id DESC LIMIT 1`,
      [periodStart]
    );
    openingBalance = Number(openingRows[0]?.balance_after ?? 0);
  }

  let totalsClause = '';
  const totalsParams = [];

  if (periodStart && periodEnd) {
    totalsClause = 'WHERE transaction_date BETWEEN ? AND ?';
    totalsParams.push(periodStart, periodEnd);
  }

  const totalsRows = await query(
    `SELECT
       COALESCE(SUM(CASE WHEN transaction_type IN ('cash_in', 'income') THEN amount ELSE 0 END), 0) AS total_inflow,
       COALESCE(SUM(CASE WHEN transaction_type IN ('cash_out', 'expense', 'transfer') THEN amount ELSE 0 END), 0) AS total_outflow
     FROM cash_book ${totalsClause}`,
    totalsParams
  );

  const closingBalance = await getLatestCashBalance();

  return {
    openingBalance,
    totalInflow: Number(totalsRows[0]?.total_inflow ?? 0),
    totalOutflow: Number(totalsRows[0]?.total_outflow ?? 0),
    closingBalance,
    netChange: Number(totalsRows[0]?.total_inflow ?? 0) - Number(totalsRows[0]?.total_outflow ?? 0),
    period: period || (periodStart ? 'custom' : 'all'),
    periodStart,
    periodEnd,
  };
};

export const isInflowType = (type) => INFLOW_TYPES.includes(type);
export const isOutflowType = (type) => OUTFLOW_TYPES.includes(type);

export { getConnection };
