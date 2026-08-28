import { query, getConnection } from '../../config/database.js';
import {
  INFLOW_TYPES,
  OUTFLOW_TYPES,
  MANUAL_REFERENCE_TYPES,
  CASH_BOOK_MODES,
  isInflowType,
  isOutflowType,
  bookSideOf,
  toSqlDate,
  resolvePeriodRange,
  computeClosing,
  emptyModeBalances,
  normalizeCashBookMode,
  applyModeDelta,
  sourceLabel,
} from '../helpers/cashBookPeriod.helper.js';

const ENTRY_ORDER = 'cb.transaction_date ASC, cb.sort_index ASC, cb.id ASC';
const ENTRY_ORDER_DESC = 'cb.transaction_date DESC, cb.sort_index DESC, cb.id DESC';

const inflowList = INFLOW_TYPES.map((type) => `'${type}'`).join(', ');
const outflowList = OUTFLOW_TYPES.map((type) => `'${type}'`).join(', ');

const modeSqlExprBare = `CASE
  WHEN payment_method = 'card' THEN 'other'
  WHEN payment_method IN ('cash', 'upi', 'bank', 'other') THEN payment_method
  ELSE 'other'
END`;

const postedClause = `cb.status = 'posted'`;
const postedClauseBare = `status = 'posted'`;

const entrySelect = `cb.id, cb.transaction_date, cb.transaction_type, cb.category, cb.description, cb.amount,
            cb.payment_method, cb.reference_type, cb.reference_id, cb.reference_number, cb.balance_after,
            cb.mode_balance_after, cb.sort_index, cb.remarks, cb.party_name, cb.party_type, cb.party_id,
            cb.source, cb.status, u.full_name AS created_by_name, cb.created_by, cb.updated_by,
            updater.full_name AS updated_by_name, cb.created_at, cb.updated_at`;

export const formatCashBookEntry = (row) => {
  const transactionType = row.transaction_type;
  const source = row.source || (MANUAL_REFERENCE_TYPES.includes(row.reference_type) ? 'manual' : 'other');
  const isOpening = source === 'opening_balance' || row.reference_type === 'opening_balance';
  const isManual = MANUAL_REFERENCE_TYPES.includes(row.reference_type) && !isOpening;
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
    paymentMethod: normalizeCashBookMode(row.payment_method) || row.payment_method,
    referenceType: row.reference_type,
    referenceId: row.reference_id,
    referenceNumber: row.reference_number || null,
    balanceAfter: Number(row.balance_after),
    modeBalanceAfter: Number(row.mode_balance_after ?? 0),
    sortIndex: Number(row.sort_index ?? 1),
    remarks: row.remarks,
    partyName: row.party_name || null,
    partyType: row.party_type || null,
    partyId: row.party_id || null,
    source,
    sourceLabel: sourceLabel(source),
    status: row.status || 'posted',
    createdBy: row.created_by || null,
    createdByName: row.created_by_name || null,
    updatedBy: row.updated_by || null,
    updatedByName: row.updated_by_name || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at || null,
    isManual,
    isOpening,
    isAuto: !isManual,
    linkedLabel: source === 'billing'
      ? 'Linked to invoice'
      : source === 'supplier_payment'
        ? 'Linked to supplier payment'
        : isOpening
          ? 'Opening balance'
          : null,
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
     WHERE ${postedClauseBare}
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
     WHERE transaction_date < ? AND ${postedClauseBare}
     ORDER BY transaction_date DESC, sort_index DESC, id DESC
     LIMIT 1`;
  if (connection) {
    const [rows] = await connection.execute(sql, [beforeDate]);
    return Number(rows[0]?.balance_after ?? 0);
  }
  const rows = await query(sql, [beforeDate]);
  return Number(rows[0]?.balance_after ?? 0);
};

export const getModeBalancesBefore = async (beforeDate, connection = null) => {
  const sql = `SELECT ${modeSqlExprBare} AS mode,
       COALESCE(SUM(CASE WHEN transaction_type IN (${inflowList}) THEN amount ELSE -amount END), 0) AS balance
     FROM cash_book
     WHERE transaction_date < ? AND ${postedClauseBare}
     GROUP BY ${modeSqlExprBare}`;
  const rows = connection
    ? (await connection.execute(sql, [beforeDate]))[0]
    : await query(sql, [beforeDate]);
  const modes = emptyModeBalances();
  rows.forEach((row) => {
    const mode = normalizeCashBookMode(row.mode) || 'other';
    modes[mode] = Number(row.balance || 0);
  });
  return modes;
};

export const createCashBookEntry = async (connection, data) => {
  const [result] = await connection.execute(
    `INSERT INTO cash_book (
       transaction_date, transaction_type, category, description, amount, payment_method,
       reference_type, reference_id, reference_number, balance_after, mode_balance_after, sort_index,
       remarks, party_name, party_type, party_id, source, status, created_by, updated_by
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      data.balanceAfter ?? 0,
      data.modeBalanceAfter ?? 0,
      data.sortIndex ?? 1,
      data.remarks || data.description || null,
      data.partyName || null,
      data.partyType || null,
      data.partyId || null,
      data.source || 'manual',
      data.status || 'posted',
      data.createdBy,
      data.updatedBy || null,
    ]
  );
  return result.insertId;
};

export const findPostedCashBookByReference = async (connection, {
  source,
  referenceType,
  referenceId,
  paymentMethod,
}) => {
  if (!referenceId) return null;
  const [rows] = await connection.execute(
    `SELECT id FROM cash_book
     WHERE source = ? AND reference_type = ? AND reference_id = ? AND payment_method = ?
       AND status = 'posted'
     LIMIT 1`,
    [source, referenceType, referenceId, paymentMethod]
  );
  return rows[0] || null;
};

export const findCashBookEntryById = async (entryId, connection = null) => {
  const sql = `SELECT ${entrySelect}
     FROM cash_book cb
     LEFT JOIN users u ON u.id = cb.created_by
     LEFT JOIN users updater ON updater.id = cb.updated_by
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
  source = null,
  category = null,
}) => {
  let whereClause = `WHERE ${postedClause}`;
  const params = [];

  if (search) {
    whereClause += ` AND (cb.category LIKE ? OR cb.description LIKE ? OR cb.remarks LIKE ?
      OR cb.reference_type LIKE ? OR cb.reference_number LIKE ? OR cb.party_name LIKE ?
      OR cb.source LIKE ?)`;
    const term = `%${search}%`;
    params.push(term, term, term, term, term, term, term);
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
    const mode = normalizeCashBookMode(paymentMethod) || paymentMethod;
    if (mode === 'other') {
      whereClause += " AND cb.payment_method IN ('other', 'card')";
    } else {
      whereClause += ' AND cb.payment_method = ?';
      params.push(mode);
    }
  }

  if (source) {
    if (source === 'other') {
      whereClause += " AND cb.source IN ('other', 'opening_balance')";
    } else {
      whereClause += ' AND cb.source = ?';
      params.push(source);
    }
  }

  if (category) {
    whereClause += ' AND cb.category = ?';
    params.push(category);
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
  source = null,
  category = null,
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
    source,
    category,
  });

  const baseFrom = `
    FROM cash_book cb
    LEFT JOIN users u ON u.id = cb.created_by
    LEFT JOIN users updater ON updater.id = cb.updated_by
  `;

  const countRows = await query(`SELECT COUNT(*) AS total ${baseFrom} ${whereClause}`, params);

  const rows = await query(
    `SELECT ${entrySelect}
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

const buildModeSummary = (openingModes, totalsByMode) => {
  const modeBalances = emptyModeBalances();
  CASH_BOOK_MODES.forEach((mode) => {
    const opening = Number(openingModes[mode] || 0);
    const jama = Number(totalsByMode[mode]?.jama || 0);
    const karchulu = Number(totalsByMode[mode]?.karchulu || 0);
    const closing = computeClosing(opening, jama, karchulu);
    modeBalances[mode] = { opening, jama, karchulu, closing };
  });
  const totalAvailable = CASH_BOOK_MODES.reduce(
    (sum, mode) => sum + Number(modeBalances[mode].closing || 0),
    0
  );
  return { modeBalances, totalAvailable };
};

export const getCashBookPeriodSummary = async ({ period, dateFrom, dateTo } = {}) => {
  const range = resolvePeriodRange(period, dateFrom, dateTo);
  const { periodStart, periodEnd } = range;

  const openingBalance = periodStart ? await getOpeningBalanceBefore(periodStart) : 0;
  const openingModes = periodStart
    ? await getModeBalancesBefore(periodStart)
    : emptyModeBalances();

  let totalsClause = `WHERE ${postedClauseBare}`;
  const totalsParams = [];
  if (periodStart && periodEnd) {
    totalsClause += ' AND transaction_date BETWEEN ? AND ?';
    totalsParams.push(periodStart, periodEnd);
  }

  const totalsRows = await query(
    `SELECT
       COALESCE(SUM(CASE WHEN transaction_type IN (${inflowList}) THEN amount ELSE 0 END), 0) AS total_jama,
       COALESCE(SUM(CASE WHEN transaction_type IN (${outflowList}) THEN amount ELSE 0 END), 0) AS total_karchulu
     FROM cash_book ${totalsClause}`,
    totalsParams
  );

  const modeRows = await query(
    `SELECT ${modeSqlExprBare} AS mode,
       COALESCE(SUM(CASE WHEN transaction_type IN (${inflowList}) THEN amount ELSE 0 END), 0) AS jama,
       COALESCE(SUM(CASE WHEN transaction_type IN (${outflowList}) THEN amount ELSE 0 END), 0) AS karchulu
     FROM cash_book ${totalsClause}
     GROUP BY ${modeSqlExprBare}`,
    totalsParams
  );

  const totalsByMode = {};
  CASH_BOOK_MODES.forEach((mode) => {
    totalsByMode[mode] = { jama: 0, karchulu: 0 };
  });
  modeRows.forEach((row) => {
    const mode = normalizeCashBookMode(row.mode) || 'other';
    totalsByMode[mode] = { jama: Number(row.jama || 0), karchulu: Number(row.karchulu || 0) };
  });

  const totalJama = Number(totalsRows[0]?.total_jama ?? 0);
  const totalKarchulu = Number(totalsRows[0]?.total_karchulu ?? 0);
  const { modeBalances, totalAvailable } = buildModeSummary(openingModes, totalsByMode);

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
    modeBalances,
    totalAvailable,
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
     WHERE transaction_date BETWEEN ? AND ? AND ${postedClauseBare}
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

export const getPartyBreakdown = async (periodStart, periodEnd) => {
  const rows = await query(
    `SELECT
       CASE WHEN transaction_type IN (${inflowList}) THEN 'jama' ELSE 'karchulu' END AS book_side,
       COALESCE(NULLIF(party_name, ''), COALESCE(NULLIF(category, ''), 'Uncategorized')) AS party,
       COALESCE(SUM(amount), 0) AS total
     FROM cash_book
     WHERE transaction_date BETWEEN ? AND ? AND ${postedClauseBare}
     GROUP BY CASE WHEN transaction_type IN (${inflowList}) THEN 'jama' ELSE 'karchulu' END,
              COALESCE(NULLIF(party_name, ''), COALESCE(NULLIF(category, ''), 'Uncategorized'))
     ORDER BY book_side ASC, total DESC`,
    [periodStart, periodEnd]
  );

  const jama = [];
  const karchulu = [];
  rows.forEach((row) => {
    const item = { party: row.party, amount: Number(row.total) };
    if (row.book_side === 'jama') jama.push(item);
    else karchulu.push(item);
  });

  return { jama, karchulu };
};

export const updateCashBookEntryRecord = async (connection, entryId, data) => {
  await connection.execute(
    `UPDATE cash_book
     SET transaction_date = ?, transaction_type = ?, category = ?, description = ?, amount = ?,
         payment_method = ?, reference_number = ?, remarks = ?, sort_index = ?,
         party_name = ?, party_type = ?, party_id = ?, updated_by = ?, updated_at = NOW()
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
      data.partyName || null,
      data.partyType || null,
      data.partyId || null,
      data.updatedBy || null,
      entryId,
    ]
  );
};

export const deleteCashBookEntryRecord = async (connection, entryId) => {
  await connection.execute('DELETE FROM cash_book WHERE id = ?', [entryId]);
};

export const recalculateCashBalances = async (connection) => {
  const [rows] = await connection.execute(
    `SELECT id, transaction_type, amount, payment_method, status
     FROM cash_book
     ORDER BY transaction_date ASC, sort_index ASC, id ASC
     FOR UPDATE`
  );

  let running = 0;
  let modes = emptyModeBalances();
  for (const row of rows) {
    if (row.status && row.status !== 'posted') {
      continue;
    }
    const amount = Number(row.amount);
    const signed = isInflowType(row.transaction_type) ? amount : -amount;
    running += signed;
    modes = applyModeDelta(modes, row.payment_method, signed);
    const mode = normalizeCashBookMode(row.payment_method) || 'other';
    await connection.execute(
      'UPDATE cash_book SET balance_after = ?, mode_balance_after = ? WHERE id = ?',
      [running, modes[mode], row.id]
    );
  }

  return { closing: running, modes };
};

export {
  isInflowType,
  isOutflowType,
  bookSideOf,
  toSqlDate,
  getConnection,
  CASH_BOOK_MODES,
  emptyModeBalances,
  normalizeCashBookMode,
  sourceLabel,
};
