import { query } from '../../config/database.js';

const buildDateFilter = (period, dateFrom, dateTo, column = 's.sale_date') => {
  if (dateFrom && dateTo) {
    return { clause: ` AND DATE(${column}) BETWEEN ? AND ?`, params: [dateFrom, dateTo] };
  }

  switch (period) {
    case 'daily':
      return { clause: ` AND DATE(${column}) = CURDATE()`, params: [] };
    case 'monthly':
      return { clause: ` AND YEAR(${column}) = YEAR(CURDATE()) AND MONTH(${column}) = MONTH(CURDATE())`, params: [] };
    case 'yearly':
      return { clause: ` AND YEAR(${column}) = YEAR(CURDATE())`, params: [] };
    default:
      return { clause: '', params: [] };
  }
};

const profitAggregateSelect = `
  SELECT
    COALESCE(SUM(si.profit_amount), 0) AS total_profit,
    COALESCE(SUM(si.total_amount), 0) AS total_revenue,
    COALESCE(SUM(si.purchase_price * si.quantity), 0) AS total_cost,
    COALESCE(SUM(si.quantity), 0) AS total_quantity,
    COUNT(DISTINCT s.id) AS sale_count
  FROM sale_items si
  INNER JOIN sales s ON s.id = si.sale_id
`;

export const formatProfitEntry = (row) => ({
  id: row.id,
  saleId: row.sale_id,
  invoiceNumber: row.invoice_number,
  saleDate: row.sale_date,
  customerName: row.customer_name || 'Walk-in',
  productId: row.product_id,
  productName: row.product_name,
  productSku: row.product_sku,
  quantity: Number(row.quantity),
  purchasePrice: Number(row.purchase_price),
  sellingPrice: Number(row.selling_price),
  discountAmount: Number(row.discount_amount),
  totalAmount: Number(row.total_amount),
  profitAmount: Number(row.profit_amount),
  costAmount: Number(row.purchase_price) * Number(row.quantity),
});

export const getProfitPeriodTotals = async (dateClause = '', params = []) => {
  const rows = await query(`${profitAggregateSelect} WHERE 1=1 ${dateClause}`, params);
  const row = rows[0] || {};
  return {
    profit: Number(row.total_profit ?? 0),
    revenue: Number(row.total_revenue ?? 0),
    cost: Number(row.total_cost ?? 0),
    quantity: Number(row.total_quantity ?? 0),
    saleCount: Number(row.sale_count ?? 0),
  };
};

export const getProfitSummary = async () => {
  const [today, monthly, yearly, overall] = await Promise.all([
    getProfitPeriodTotals(' AND DATE(s.sale_date) = CURDATE()'),
    getProfitPeriodTotals(' AND YEAR(s.sale_date) = YEAR(CURDATE()) AND MONTH(s.sale_date) = MONTH(CURDATE())'),
    getProfitPeriodTotals(' AND YEAR(s.sale_date) = YEAR(CURDATE())'),
    getProfitPeriodTotals(),
  ]);

  return { today, monthly, yearly, overall };
};

export const getProfitChartData = async ({ period, dateFrom, dateTo } = {}) => {
  if (dateFrom && dateTo) {
    const start = new Date(dateFrom);
    const end = new Date(dateTo);
    const daySpan = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

    if (daySpan <= 31) {
      const rows = await query(
        `SELECT DATE(s.sale_date) AS label,
                COALESCE(SUM(si.profit_amount), 0) AS profit,
                COALESCE(SUM(si.total_amount), 0) AS revenue
         FROM sale_items si
         INNER JOIN sales s ON s.id = si.sale_id
         WHERE DATE(s.sale_date) BETWEEN ? AND ?
         GROUP BY DATE(s.sale_date)
         ORDER BY label ASC`,
        [dateFrom, dateTo]
      );
      return rows.map((row) => ({
        label: row.label,
        profit: Number(row.profit),
        revenue: Number(row.revenue),
      }));
    }

    const rows = await query(
      `SELECT DATE_FORMAT(s.sale_date, '%Y-%m') AS label,
              COALESCE(SUM(si.profit_amount), 0) AS profit,
              COALESCE(SUM(si.total_amount), 0) AS revenue
       FROM sale_items si
       INNER JOIN sales s ON s.id = si.sale_id
       WHERE DATE(s.sale_date) BETWEEN ? AND ?
       GROUP BY DATE_FORMAT(s.sale_date, '%Y-%m')
       ORDER BY label ASC`,
      [dateFrom, dateTo]
    );
    return rows.map((row) => ({
      label: row.label,
      profit: Number(row.profit),
      revenue: Number(row.revenue),
    }));
  }

  switch (period) {
    case 'daily':
      return getDailyChartLast7Days();
    case 'monthly':
      return getDailyChartCurrentMonth();
    case 'yearly':
      return getMonthlyChartCurrentYear();
    default:
      return getMonthlyChartLast12Months();
  }
};

const getDailyChartLast7Days = async () => {
  const rows = await query(
    `SELECT DATE(s.sale_date) AS label,
            COALESCE(SUM(si.profit_amount), 0) AS profit,
            COALESCE(SUM(si.total_amount), 0) AS revenue
     FROM sale_items si
     INNER JOIN sales s ON s.id = si.sale_id
     WHERE s.sale_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
     GROUP BY DATE(s.sale_date)
     ORDER BY label ASC`
  );
  return rows.map((row) => ({
    label: row.label,
    profit: Number(row.profit),
    revenue: Number(row.revenue),
  }));
};

const getDailyChartCurrentMonth = async () => {
  const rows = await query(
    `SELECT DATE(s.sale_date) AS label,
            COALESCE(SUM(si.profit_amount), 0) AS profit,
            COALESCE(SUM(si.total_amount), 0) AS revenue
     FROM sale_items si
     INNER JOIN sales s ON s.id = si.sale_id
     WHERE YEAR(s.sale_date) = YEAR(CURDATE()) AND MONTH(s.sale_date) = MONTH(CURDATE())
     GROUP BY DATE(s.sale_date)
     ORDER BY label ASC`
  );
  return rows.map((row) => ({
    label: row.label,
    profit: Number(row.profit),
    revenue: Number(row.revenue),
  }));
};

const getMonthlyChartCurrentYear = async () => {
  const rows = await query(
    `SELECT DATE_FORMAT(s.sale_date, '%b') AS label,
            DATE_FORMAT(s.sale_date, '%Y-%m') AS sort_key,
            COALESCE(SUM(si.profit_amount), 0) AS profit,
            COALESCE(SUM(si.total_amount), 0) AS revenue
     FROM sale_items si
     INNER JOIN sales s ON s.id = si.sale_id
     WHERE YEAR(s.sale_date) = YEAR(CURDATE())
     GROUP BY DATE_FORMAT(s.sale_date, '%Y-%m'), DATE_FORMAT(s.sale_date, '%b')
     ORDER BY sort_key ASC`
  );
  return rows.map((row) => ({
    label: row.label,
    profit: Number(row.profit),
    revenue: Number(row.revenue),
  }));
};

const getMonthlyChartLast12Months = async () => {
  const rows = await query(
    `SELECT DATE_FORMAT(s.sale_date, '%b %Y') AS label,
            DATE_FORMAT(s.sale_date, '%Y-%m') AS sort_key,
            COALESCE(SUM(si.profit_amount), 0) AS profit,
            COALESCE(SUM(si.total_amount), 0) AS revenue
     FROM sale_items si
     INNER JOIN sales s ON s.id = si.sale_id
     WHERE s.sale_date >= DATE_SUB(CURDATE(), INTERVAL 11 MONTH)
     GROUP BY DATE_FORMAT(s.sale_date, '%Y-%m'), DATE_FORMAT(s.sale_date, '%b %Y')
     ORDER BY sort_key ASC`
  );
  return rows.map((row) => ({
    label: row.label,
    profit: Number(row.profit),
    revenue: Number(row.revenue),
  }));
};

export const findProfitEntries = async ({
  search = '',
  period = null,
  dateFrom = null,
  dateTo = null,
  page = 1,
  limit = 10,
  sortBy = 'saleDate',
  sortOrder = 'desc',
}) => {
  const offset = (page - 1) * limit;
  const sortMap = {
    saleDate: 's.sale_date',
    profitAmount: 'si.profit_amount',
    totalAmount: 'si.total_amount',
    productName: 'p.name',
    invoiceNumber: 's.invoice_number',
  };
  const sortColumn = sortMap[sortBy] || sortMap.saleDate;
  const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  let whereClause = 'WHERE 1=1';
  const params = [];

  if (search) {
    whereClause += ' AND (s.invoice_number LIKE ? OR p.name LIKE ? OR p.sku LIKE ? OR c.name LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }

  const dateFilter = buildDateFilter(period, dateFrom, dateTo);
  whereClause += dateFilter.clause;
  params.push(...dateFilter.params);

  const baseFrom = `
    FROM sale_items si
    INNER JOIN sales s ON s.id = si.sale_id
    INNER JOIN products p ON p.id = si.product_id
    LEFT JOIN customers c ON c.id = s.customer_id
  `;

  const countRows = await query(`SELECT COUNT(*) AS total ${baseFrom} ${whereClause}`, params);

  const rows = await query(
    `SELECT si.id, si.sale_id, s.invoice_number, s.sale_date, c.name AS customer_name,
            si.product_id, p.name AS product_name, p.sku AS product_sku,
            si.quantity, si.purchase_price, si.selling_price, si.discount_amount,
            si.total_amount, si.profit_amount
     ${baseFrom}
     ${whereClause}
     ORDER BY ${sortColumn} ${order}, si.id ${order}
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    entries: rows.map(formatProfitEntry),
    total: countRows[0]?.total || 0,
  };
};

export const findProfitEntriesForExport = async (filters) => {
  const { entries } = await findProfitEntries({ ...filters, page: 1, limit: 10000 });
  return entries;
};

export const getFilteredProfitTotals = async (filters = {}) => {
  let whereClause = 'WHERE 1=1';
  const params = [];

  if (filters.search) {
    whereClause += ' AND (s.invoice_number LIKE ? OR p.name LIKE ? OR p.sku LIKE ? OR c.name LIKE ?)';
    const term = `%${filters.search}%`;
    params.push(term, term, term, term);
  }

  const dateFilter = buildDateFilter(filters.period, filters.dateFrom, filters.dateTo);
  whereClause += dateFilter.clause;
  params.push(...dateFilter.params);

  const rows = await query(
    `${profitAggregateSelect}
     INNER JOIN products p ON p.id = si.product_id
     LEFT JOIN customers c ON c.id = s.customer_id
     ${whereClause}`,
    params
  );

  const row = rows[0] || {};
  return {
    profit: Number(row.total_profit ?? 0),
    revenue: Number(row.total_revenue ?? 0),
    cost: Number(row.total_cost ?? 0),
    quantity: Number(row.total_quantity ?? 0),
    saleCount: Number(row.sale_count ?? 0),
  };
};
