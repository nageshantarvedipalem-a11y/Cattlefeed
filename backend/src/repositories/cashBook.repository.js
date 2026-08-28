import { query, getConnection } from '../../config/database.js';
import {
  INFLOW_TYPES,
  OUTFLOW_TYPES,
  MANUAL_REFERENCE_TYPES,
  isInflowType,
  isOutflowType,
  bookSideOf,
  toSqlDate,
  resolvePeriodRange,
  computeClosing,
} from '../helpers/cashBookPeriod.helper.js';

const ENTRY_ORDER = 'cb.transaction_date ASC, cb.sort_index ASC, cb.id ASC';
const ENTRY_ORDER_DESC = 'cb.transaction_date DESC, cb.sort_index DESC, cb.id DESC';

const inflowList = INFLOW_TYPES.map((type) => `'${type}'`).join(', ');
const outflowList = OUTFLOW_TYPES.map((type) => `'${type}'`).join(', ');

export const formatCashBookEntry = (row) => {
  const transactionType = row.transaction_type;
  return {
    id: row.id,
    transactionDate: row.transaction_date,
    transactionType,
    bookSide: bookSideOf(transactionType),
    category: row.category,
    description: row.description || row.remarks || null,
    amount: Number(row.amount),
    jamaAmount: isInflowType(transactionType) ? Number(row.amount) : 0,
    karchuluAmount: isOutflowType(transactionType) ? Number(row.amount) : 0,
    paymentMethod: row.payment_method,
    referenceType: row.reference_type,
    referenceId: row.reference_id,
    referenceNumber: row.reference_number || null,
    balanceAfter: Number(row.balance_after),
    sortIndex: Number(row.sort_index ?? 1),
    remarks: row.remarks,
    createdByName: row.created_by_name || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at || null,
    isManual: MANUAL_REFERENCE_TYPES.includes(row.reference_type),
  };
};

const buildDateFilter = (period, dateFrom, dateTo) => {
  const { periodStart, periodEnd } = resolvePeriodRange(period, dateFrom, dateTo);
  if (periodStart && periodEnd) {
    return { clause: ' AND cb.transaction_date BETWEEN ? AND ?', params: [periodStart, periodEnd] };
  }
  return { clause: '', params: [] };
};

const latestBalanceSql = `SELECT balance_after FROM cash_book
     ORDER BY transaction_date DESC, sort_index DESC, id DESC
     LIMIT 1`;

export const getLatestCashBalance = async (connection = null) => {
  if (connection) {
    const [rows] = await connection.execute(`${latestBalanceSql} FOR UPDATE`);
    return Number(rows[0]?.balance_after ?? 0);
  }
  const rows = await query(latestBalanceSql);
  return Number(rows[0]?.balance_after ?? 0);
};

export const getOpeningBalanceBefore = async (beforeDate, connection = null) => {
  const sql = `SELECT balance_after FROM cash_book
     WHERE transaction_date < ?
     ORDER BY transaction_date DESC, sort_index DESC, id DESC
     LIMIT 1`;
  if (connection) {
    const [rows] = await connection.execute(sql, [beforeDate]);
    return Number(rows[0]?.balance_after ?? 0);
  }
  const rows = await query(sql, [beforeDate]);
  return Number(rows[0]?.balance_after ?? 0);
};

export const createCashBookEntry = async (connection, data) => {
  const [result] = await connection.execute(
    `INSERT INTO cash_book (
       transaction_date, transaction_type, category, description, amount, payment_method,
       reference_type, reference_id, reference_number, balance_after, sort_index, remarks, created_by
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.transactionDate,
      data.transactionType,
      data.category || null,
      data.description || data.remarks || null,
      data.amount,
      data.paymentMethod,
      data.referenceType || null,
      data.referenceId || null,
      data.referenceNumber || null,
      data.balanceAfter,
      data.sortIndex ?? 1,
      data.remarks || data.description || null,
      data.createdBy,
    ]
  );
  return result.insertId;
};

export const findCashBookEntryById = async (entryId, connection = null) => {
  const sql = `SELECT cb.id, cb.transaction_date, cb.transaction_type, cb.category, cb.description,
            cb.amount, cb.payment_method, cb.reference_type, cb.reference_id, cb.reference_number,
            cb.balance_after, cb.sort_index, cb.remarks, u.full_name AS created_by_name,
            cb.created_at, cb.updated_at
     FROM cash_book cb
     LEFT JOIN users u ON u.id = cb.created_by
     WHERE cb.id = ?
     LIMIT 1`;
  if (connection) {
    const [rows] = await connection.execute(sql, [entryId]);
    return rows[0] ? formatCashBookEntry(rows[0]) : null;
  }
  const rows = await query(sql, [entryId]);
  return rows[0] ? formatCashBookEntry(rows[0]) : null;
};

const buildEntryFilters = ({
  search = '',
  transactionType = null,
  bookSide = null,
  paymentMethod = null,
  period = null,
  dateFrom = null,
  dateTo = null,
}) => {
  let whereClause = 'WHERE 1=1';
  const params = [];

  if (search) {
    whereClause += ' AND (cb.category LIKE ? OR cb.description LIKE ? OR cb.remarks LIKE ? OR cb.reference_type LIKE ? OR cb.reference_number LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term, term, term);
  }

  if (bookSide === 'jama') {
    whereClause += ` AND cb.transaction_type IN (${inflowList})`;
  } else if (bookSide === 'karchulu') {
    whereClause += ` AND cb.transaction_type IN (${outflowList})`;
  } else if (transactionType) {
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

  return { whereClause, params };
};

export const findCashBookEntries = async ({
  search = '',
  transactionType = null,
  bookSide = null,
  paymentMethod = null,
  period = null,
  dateFrom = null,
  dateTo = null,
  page = 1,
  limit = 10,
  sortOrder = 'desc',
}) => {
  const offset = (page - 1) * limit;
  const order = sortOrder.toLowerCase() === 'asc' ? ENTRY_ORDER : ENTRY_ORDER_DESC;
  const { whereClause, params } = buildEntryFilters({
    search,
    transactionType,
    bookSide,
    paymentMethod,
    period,
    dateFrom,
    dateTo,
  });

  const baseFrom = `
    FROM cash_book cb
    LEFT JOIN users u ON u.id = cb.created_by
  `;

  const countRows = await query(`SELECT COUNT(*) AS total ${baseFrom} ${whereClause}`, params);

  const rows = await query(
    `SELECT cb.id, cb.transaction_date, cb.transaction_type, cb.category, cb.description, cb.amount,
            cb.payment_method, cb.reference_type, cb.reference_id, cb.reference_number, cb.balance_after,
            cb.sort_index, cb.remarks, u.full_name AS created_by_name, cb.created_at, cb.updated_at
     ${baseFrom}
     ${whereClause}
     ORDER BY ${order}
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
  const range = resolvePeriodRange(period, dateFrom, dateTo);
  const { periodStart, periodEnd } = range;

  const openingBalance = periodStart ? await getOpeningBalanceBefore(periodStart) : 0;

  let totalsClause = '';
  const totalsParams = [];
  if (periodStart && periodEnd) {
    totalsClause = 'WHERE transaction_date BETWEEN ? AND ?';
    totalsParams.push(periodStart, periodEnd);
  }

  const totalsRows = await query(
    `SELECT
       COALESCE(SUM(CASE WHEN transaction_type IN (${inflowList}) THEN amount ELSE 0 END), 0) AS total_jama,
       COALESCE(SUM(CASE WHEN transaction_type IN (${outflowList}) THEN amount ELSE 0 END), 0) AS total_karchulu
     FROM cash_book ${totalsClause}`,
    totalsParams
  );

  const totalJama = Number(totalsRows[0]?.total_jama ?? 0);
  const totalKarchulu = Number(totalsRows[0]?.total_karchulu ?? 0);

  let closingBalance;
  if (periodStart) {
    closingBalance = computeClosing(openingBalance, totalJama, totalKarchulu);
  } else {
    const latest = await query(latestBalanceSql);
    closingBalance = Number(latest[0]?.balance_after ?? 0);
  }

  return {
    openingBalance,
    totalJama,
    totalKarchulu,
    totalInflow: totalJama,
    totalOutflow: totalKarchulu,
    closingBalance,
    netChange: totalJama - totalKarchulu,
    period: range.period,
    periodStart,
    periodEnd,
    formula: `${Number(openingBalance).toFixed(2)} + ${totalJama.toFixed(2)} - ${totalKarchulu.toFixed(2)} = ${Number(closingBalance).toFixed(2)}`,
  };
};

export const getCategoryBreakdown = async (periodStart, periodEnd) => {
  const rows = await query(
    `SELECT
       CASE WHEN transaction_type IN (${inflowList}) THEN 'jama' ELSE 'karchulu' END AS book_side,
       COALESCE(NULLIF(category, ''), 'Uncategorized') AS category,
       COALESCE(SUM(amount), 0) AS total
     FROM cash_book
     WHERE transaction_date BETWEEN ? AND ?
     GROUP BY CASE WHEN transaction_type IN (${inflowList}) THEN 'jama' ELSE 'karchulu' END,
              COALESCE(NULLIF(category, ''), 'Uncategorized')
     ORDER BY book_side ASC, total DESC`,
    [periodStart, periodEnd]
  );

  const jama = [];
  const karchulu = [];
  rows.forEach((row) => {
    const item = { category: row.category, amount: Number(row.total) };
    if (row.book_side === 'jama') jama.push(item);
    else karchulu.push(item);
  });

  return { jama, karchulu };
};

export const updateCashBookEntryRecord = async (connection, entryId, data) => {
  await connection.execute(
    `UPDATE cash_book
     SET transaction_date = ?, transaction_type = ?, category = ?, description = ?, amount = ?,
         payment_method = ?, reference_number = ?, remarks = ?, sort_index = ?, updated_at = NOW()
     WHERE id = ?`,
    [
      data.transactionDate,
      data.transactionType,
      data.category || null,
      data.description || data.remarks || null,
      data.amount,
      data.paymentMethod,
      data.referenceNumber || null,
      data.remarks || data.description || null,
      data.sortIndex ?? 1,
      entryId,
    ]
  );
};

export const deleteCashBookEntryRecord = async (connection, entryId) => {
  await connection.execute('DELETE FROM cash_book WHERE id = ?', [entryId]);
};

export const recalculateCashBalances = async (connection) => {
  const [rows] = await connection.execute(
    `SELECT id, transaction_type, amount
     FROM cash_book
     ORDER BY transaction_date ASC, sort_index ASC, id ASC
     FOR UPDATE`
  );

  let running = 0;
  for (const row of rows) {
    if (isInflowType(row.transaction_type)) {
      running += Number(row.amount);
    } else {
      running -= Number(row.amount);
    }
    await connection.execute(
      'UPDATE cash_book SET balance_after = ? WHERE id = ?',
      [running, row.id]
    );
  }

  return running;
};

export { isInflowType, isOutflowType, bookSideOf, toSqlDate, getConnection };
