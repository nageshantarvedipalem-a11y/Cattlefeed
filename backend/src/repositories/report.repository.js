import { query } from '../../config/database.js';

export const buildPeriodFilter = (period, dateFrom, dateTo, column) => {
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

export const getSummaryReport = async ({ period, dateFrom, dateTo } = {}) => {
  const salesFilter = buildPeriodFilter(period, dateFrom, dateTo, 's.sale_date');
  const purchaseFilter = buildPeriodFilter(period, dateFrom, dateTo, 'p.purchase_date');
  const paymentFilter = buildPeriodFilter(period, dateFrom, dateTo, 'pay.payment_date');
  const cashFilter = buildPeriodFilter(period, dateFrom, dateTo, 'cb.transaction_date');

  const [salesRows, purchaseRows, profitRows, paymentRows, cashRows, pendingRows, customerRows, lowStockRows] = await Promise.all([
    query(
      `SELECT COUNT(*) AS count, COALESCE(SUM(total_amount), 0) AS total,
              COALESCE(SUM(paid_amount), 0) AS paid, COALESCE(SUM(pending_amount), 0) AS pending
       FROM sales s WHERE 1=1 ${salesFilter.clause}`,
      salesFilter.params
    ),
    query(
      `SELECT COUNT(*) AS count, COALESCE(SUM(total_amount), 0) AS total,
              COALESCE(SUM(paid_amount), 0) AS paid
       FROM purchases p WHERE 1=1 ${purchaseFilter.clause}`,
      purchaseFilter.params
    ),
    query(
      `SELECT COALESCE(SUM(si.profit_amount), 0) AS profit, COALESCE(SUM(si.total_amount), 0) AS revenue
       FROM sale_items si INNER JOIN sales s ON s.id = si.sale_id WHERE 1=1 ${salesFilter.clause}`,
      salesFilter.params
    ),
    query(
      `SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total
       FROM payments pay WHERE 1=1 ${paymentFilter.clause}`,
      paymentFilter.params
    ),
    query(
      `SELECT
         COALESCE(SUM(CASE WHEN transaction_type IN ('cash_in', 'income') THEN amount ELSE 0 END), 0) AS inflow,
         COALESCE(SUM(CASE WHEN transaction_type IN ('cash_out', 'expense', 'transfer') THEN amount ELSE 0 END), 0) AS outflow
       FROM cash_book cb WHERE 1=1 ${cashFilter.clause}`,
      cashFilter.params
    ),
    query(
      `SELECT COALESCE(SUM(pending_amount), 0) AS total, COUNT(*) AS count
       FROM sales WHERE pending_amount > 0`
    ),
    query(`SELECT COUNT(*) AS total FROM customers WHERE is_active = 1`),
    query(
      `SELECT COUNT(*) AS total FROM products WHERE status = 'active' AND current_stock <= min_stock`
    ),
  ]);

  const cashInflow = Number(cashRows[0]?.inflow ?? 0);
  const cashOutflow = Number(cashRows[0]?.outflow ?? 0);

  return {
    sales: {
      count: Number(salesRows[0]?.count ?? 0),
      total: Number(salesRows[0]?.total ?? 0),
      paid: Number(salesRows[0]?.paid ?? 0),
      pending: Number(salesRows[0]?.pending ?? 0),
    },
    purchases: {
      count: Number(purchaseRows[0]?.count ?? 0),
      total: Number(purchaseRows[0]?.total ?? 0),
      paid: Number(purchaseRows[0]?.paid ?? 0),
    },
    profit: {
      amount: Number(profitRows[0]?.profit ?? 0),
      revenue: Number(profitRows[0]?.revenue ?? 0),
    },
    payments: {
      count: Number(paymentRows[0]?.count ?? 0),
      total: Number(paymentRows[0]?.total ?? 0),
    },
    cashBook: {
      inflow: cashInflow,
      outflow: cashOutflow,
      net: cashInflow - cashOutflow,
    },
    outstanding: {
      pendingInvoices: Number(pendingRows[0]?.count ?? 0),
      pendingAmount: Number(pendingRows[0]?.total ?? 0),
    },
    customers: {
      active: Number(customerRows[0]?.total ?? 0),
    },
    stock: {
      lowStockProducts: Number(lowStockRows[0]?.total ?? 0),
    },
    period: period || (dateFrom ? 'custom' : 'all'),
  };
};

export const findCustomerReportRows = async ({
  search = '',
  period = null,
  dateFrom = null,
  dateTo = null,
  page = 1,
  limit = 10,
}) => {
  const offset = (page - 1) * limit;
  let whereClause = 'WHERE c.is_active = 1';
  const params = [];

  if (search) {
    whereClause += ' AND (c.name LIKE ? OR c.phone LIKE ? OR c.village LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  const salesFilter = buildPeriodFilter(period, dateFrom, dateTo, 'sale_date');
  const periodSalesParams = [...salesFilter.params];

  const countRows = await query(`SELECT COUNT(*) AS total FROM customers c ${whereClause}`, params);

  const rows = await query(
    `SELECT c.id, c.name, c.phone, c.village,
            COALESCE(lb.balance, 0) AS current_balance,
            COALESCE(ps.period_sales, 0) AS period_sales,
            COALESCE(ps.period_sales_amount, 0) AS period_sales_amount,
            COALESCE(pend.pending_amount, 0) AS pending_amount
     FROM customers c
     LEFT JOIN (
       SELECT cl.customer_id, cl.balance
       FROM customer_ledger cl
       INNER JOIN (
         SELECT customer_id, MAX(id) AS max_id FROM customer_ledger GROUP BY customer_id
       ) latest ON latest.max_id = cl.id
     ) lb ON lb.customer_id = c.id
     LEFT JOIN (
       SELECT customer_id, COUNT(*) AS period_sales, COALESCE(SUM(total_amount), 0) AS period_sales_amount
       FROM sales
       WHERE customer_id IS NOT NULL ${salesFilter.clause}
       GROUP BY customer_id
     ) ps ON ps.customer_id = c.id
     LEFT JOIN (
       SELECT customer_id, COALESCE(SUM(pending_amount), 0) AS pending_amount
       FROM sales WHERE pending_amount > 0 GROUP BY customer_id
     ) pend ON pend.customer_id = c.id
     ${whereClause}
     ORDER BY c.name ASC
     LIMIT ? OFFSET ?`,
    [...periodSalesParams, ...params, limit, offset]
  );

  return {
    rows: rows.map((row) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      village: row.village,
      currentBalance: Number(row.current_balance),
      periodSales: Number(row.period_sales),
      periodSalesAmount: Number(row.period_sales_amount),
      pendingAmount: Number(row.pending_amount),
    })),
    total: countRows[0]?.total || 0,
  };
};

export const findCustomerReportForExport = async (filters) => {
  const { rows } = await findCustomerReportRows({ ...filters, page: 1, limit: 10000 });
  return rows;
};
