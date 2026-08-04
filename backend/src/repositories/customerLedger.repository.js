import { query, getConnection } from '../../config/database.js';

export const formatLedgerEntry = (row) => ({
  id: row.id,
  customerId: row.customer_id,
  customerName: row.customer_name || null,
  transactionDate: row.transaction_date,
  transactionType: row.transaction_type,
  referenceType: row.reference_type,
  referenceId: row.reference_id,
  debit: Number(row.debit),
  credit: Number(row.credit),
  balance: Number(row.balance),
  remarks: row.remarks,
  createdByName: row.created_by_name || null,
  createdAt: row.created_at,
});

const buildDateFilter = (period, dateFrom, dateTo, column = 'cl.transaction_date') => {
  if (dateFrom && dateTo) {
    return {
      clause: ` AND DATE(${column}) BETWEEN ? AND ?`,
      params: [dateFrom, dateTo],
    };
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const day = String(now.getDate()).padStart(2, '0');
  const today = `${year}-${String(month).padStart(2, '0')}-${day}`;

  switch (period) {
    case 'daily':
      return { clause: ` AND DATE(${column}) = ?`, params: [today] };
    case 'monthly':
      return { clause: ` AND YEAR(${column}) = ? AND MONTH(${column}) = ?`, params: [year, month] };
    case 'yearly':
      return { clause: ` AND YEAR(${column}) = ?`, params: [year] };
    default:
      return { clause: '', params: [] };
  }
};

export const findCustomerLedgerSummaries = async ({
  search = '',
  village = '',
  page = 1,
  limit = 10,
  sortBy = 'currentBalance',
  sortOrder = 'desc',
}) => {
  const offset = (page - 1) * limit;
  const sortMap = {
    name: 'c.name',
    village: 'c.village',
    currentBalance: 'current_balance',
    pendingAmount: 'pending_amount',
  };
  const sortColumn = sortMap[sortBy] || sortMap.currentBalance;
  const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  let whereClause = 'WHERE c.is_active = 1';
  const params = [];

  if (search) {
    whereClause += ' AND (c.name LIKE ? OR c.phone LIKE ? OR c.village LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  if (village) {
    whereClause += ' AND c.village = ?';
    params.push(village);
  }

  const baseFrom = `
    FROM customers c
    LEFT JOIN (
      SELECT cl.customer_id, cl.balance AS current_balance
      FROM customer_ledger cl
      INNER JOIN (
        SELECT customer_id, MAX(id) AS max_id FROM customer_ledger GROUP BY customer_id
      ) latest ON latest.max_id = cl.id
    ) lb ON lb.customer_id = c.id
    LEFT JOIN (
      SELECT customer_id, COALESCE(SUM(pending_amount), 0) AS pending_amount
      FROM sales WHERE customer_id IS NOT NULL GROUP BY customer_id
    ) pp ON pp.customer_id = c.id
  `;

  const countRows = await query(`SELECT COUNT(*) AS total ${baseFrom} ${whereClause}`, params);

  const rows = await query(
    `SELECT c.id, c.name, c.phone, c.village,
            COALESCE(lb.current_balance, 0) AS current_balance,
            COALESCE(pp.pending_amount, 0) AS pending_amount
     ${baseFrom}
     ${whereClause}
     ORDER BY ${sortColumn} ${order}
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    summaries: rows.map((row) => ({
      customerId: row.id,
      customerName: row.name,
      phone: row.phone,
      village: row.village,
      currentBalance: Number(row.current_balance),
      pendingAmount: Number(row.pending_amount),
    })),
    total: countRows[0]?.total || 0,
  };
};

export const findLedgerEntries = async ({
  customerId = null,
  search = '',
  transactionType = null,
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

  if (customerId) {
    whereClause += ' AND cl.customer_id = ?';
    params.push(customerId);
  }

  if (search) {
    whereClause += ' AND (c.name LIKE ? OR cl.remarks LIKE ? OR c.phone LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  if (transactionType) {
    whereClause += ' AND cl.transaction_type = ?';
    params.push(transactionType);
  }

  const dateFilter = buildDateFilter(period, dateFrom, dateTo);
  whereClause += dateFilter.clause;
  params.push(...dateFilter.params);

  const baseFrom = `
    FROM customer_ledger cl
    INNER JOIN customers c ON c.id = cl.customer_id
    LEFT JOIN users u ON u.id = cl.created_by
  `;

  const countRows = await query(`SELECT COUNT(*) AS total ${baseFrom} ${whereClause}`, params);

  const rows = await query(
    `SELECT cl.id, cl.customer_id, c.name AS customer_name, cl.transaction_date,
            cl.transaction_type, cl.reference_type, cl.reference_id,
            cl.debit, cl.credit, cl.balance, cl.remarks, u.full_name AS created_by_name,
            cl.created_at
     ${baseFrom}
     ${whereClause}
     ORDER BY cl.transaction_date ${order}, cl.id ${order}
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    entries: rows.map(formatLedgerEntry),
    total: countRows[0]?.total || 0,
  };
};

export const findLedgerEntriesForExport = async (filters) => {
  const { entries } = await findLedgerEntries({ ...filters, page: 1, limit: 10000 });
  return entries;
};

export const getLedgerPeriodSummary = async (customerId, { period, dateFrom, dateTo } = {}) => {
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

  const customerRows = await query(
    'SELECT id, name, phone, village FROM customers WHERE id = ? LIMIT 1',
    [customerId]
  );
  const customer = customerRows[0];
  if (!customer) return null;

  const pendingRows = await query(
    `SELECT COALESCE(SUM(pending_amount), 0) AS pending_amount
     FROM sales WHERE customer_id = ? AND pending_amount > 0`,
    [customerId]
  );

  let openingBalance = 0;
  if (periodStart) {
    const openingRows = await query(
      `SELECT balance FROM customer_ledger
       WHERE customer_id = ? AND DATE(transaction_date) < ?
       ORDER BY id DESC LIMIT 1`,
      [customerId, periodStart]
    );
    openingBalance = Number(openingRows[0]?.balance ?? 0);
  } else {
    const openingRows = await query(
      `SELECT balance FROM customer_ledger
       WHERE customer_id = ? AND transaction_type = 'opening'
       ORDER BY id ASC LIMIT 1`,
      [customerId]
    );
    if (openingRows[0]) {
      openingBalance = Number(openingRows[0].balance);
    }
  }

  let totalsClause = 'WHERE customer_id = ?';
  const totalsParams = [customerId];

  if (periodStart && periodEnd) {
    totalsClause += ' AND DATE(transaction_date) BETWEEN ? AND ?';
    totalsParams.push(periodStart, periodEnd);
  }

  const totalsRows = await query(
    `SELECT COALESCE(SUM(debit), 0) AS total_debit,
            COALESCE(SUM(credit), 0) AS total_credit
     FROM customer_ledger ${totalsClause}`,
    totalsParams
  );

  const closingRows = await query(
    `SELECT balance FROM customer_ledger
     WHERE customer_id = ?
     ORDER BY id DESC LIMIT 1`,
    [customerId]
  );

  const totalDebit = Number(totalsRows[0]?.total_debit ?? 0);
  const totalCredit = Number(totalsRows[0]?.total_credit ?? 0);
  const closingBalance = Number(closingRows[0]?.balance ?? 0);

  return {
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      village: customer.village,
    },
    openingBalance,
    totalDebit,
    totalCredit,
    closingBalance,
    pendingAmount: Number(pendingRows[0]?.pending_amount ?? 0),
    period: period || (periodStart ? 'custom' : 'all'),
    periodStart,
    periodEnd,
  };
};

export const createOpeningLedgerEntry = async (connection, {
  customerId,
  openingBalance,
  openingBalanceType,
  createdBy,
  remarks = 'Opening balance',
}) => {
  const debit = openingBalanceType === 'debit' ? openingBalance : 0;
  const credit = openingBalanceType === 'credit' ? openingBalance : 0;
  const balance = openingBalanceType === 'debit' ? openingBalance : -openingBalance;

  await connection.execute(
    `INSERT INTO customer_ledger
     (customer_id, transaction_date, transaction_type, reference_type, reference_id, debit, credit, balance, remarks, created_by)
     VALUES (?, NOW(), 'opening', 'customer', ?, ?, ?, ?, ?, ?)`,
    [customerId, customerId, debit, credit, balance, remarks, createdBy]
  );
};

export const findOpeningLedgerEntry = async (customerId) => {
  const rows = await query(
    `SELECT id, debit, credit, balance
     FROM customer_ledger
     WHERE customer_id = ? AND transaction_type = 'opening'
     ORDER BY id ASC
     LIMIT 1`,
    [customerId]
  );
  return rows[0] || null;
};

export const updateOpeningLedgerEntry = async (connection, ledgerId, {
  openingBalance,
  openingBalanceType,
}) => {
  const debit = openingBalanceType === 'debit' ? openingBalance : 0;
  const credit = openingBalanceType === 'credit' ? openingBalance : 0;
  const balance = openingBalanceType === 'debit' ? openingBalance : -openingBalance;

  await connection.execute(
    `UPDATE customer_ledger
     SET debit = ?, credit = ?, balance = ?
     WHERE id = ? AND transaction_type = 'opening'`,
    [debit, credit, balance, ledgerId]
  );
};

export const countNonOpeningLedgerEntries = async (customerId) => {
  const rows = await query(
    `SELECT COUNT(*) AS total FROM customer_ledger
     WHERE customer_id = ? AND transaction_type != 'opening'`,
    [customerId]
  );
  return rows[0]?.total || 0;
};

export const getLatestCustomerBalance = async (connection, customerId) => {
  const [rows] = await connection.execute(
    `SELECT balance FROM customer_ledger
     WHERE customer_id = ?
     ORDER BY id DESC
     LIMIT 1`,
    [customerId]
  );
  return Number(rows[0]?.balance ?? 0);
};

export const createLedgerEntry = async (connection, data) => {
  const [result] = await connection.execute(
    `INSERT INTO customer_ledger (
       customer_id, transaction_date, transaction_type, reference_type, reference_id,
       debit, credit, balance, remarks, created_by
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.customerId,
      data.transactionDate,
      data.transactionType,
      data.referenceType || null,
      data.referenceId || null,
      data.debit,
      data.credit,
      data.balance,
      data.remarks || null,
      data.createdBy,
    ]
  );
  return result.insertId;
};

export { getConnection };
