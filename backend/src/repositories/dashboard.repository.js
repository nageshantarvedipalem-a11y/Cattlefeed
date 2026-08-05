import { query } from '../../config/database.js';
import {
  buildDateWhere,
  buildGroupSelect,
  resolveChartConfig,
} from '../utils/chartFilters.js';

export const getDashboardCards = async () => {
  const [row] = await query(`
    SELECT
      (SELECT COALESCE(SUM(total_amount), 0) FROM sales WHERE DATE(sale_date) = CURDATE()) AS today_sales,
      (SELECT COUNT(*) FROM sales WHERE DATE(sale_date) = CURDATE()) AS today_sales_count,
      (SELECT COALESCE(SUM(total_amount), 0) FROM purchases WHERE DATE(purchase_date) = CURDATE()) AS today_purchases,
      (SELECT COUNT(*) FROM purchases WHERE DATE(purchase_date) = CURDATE()) AS today_purchase_count,
      (SELECT COALESCE(SUM(si.profit_amount), 0)
       FROM sale_items si INNER JOIN sales s ON s.id = si.sale_id
       WHERE DATE(s.sale_date) = CURDATE()) AS today_profit,
      (SELECT COALESCE(SUM(amount), 0) FROM cash_book
       WHERE DATE(transaction_date) = CURDATE()
       AND transaction_type IN ('cash_in', 'income')) AS today_collection,
      (SELECT COALESCE(SUM(pending_amount), 0) FROM sales
       WHERE DATE(sale_date) = CURDATE() AND pending_amount > 0) AS today_pending,
      (SELECT COUNT(*) FROM sales
       WHERE DATE(sale_date) = CURDATE() AND pending_amount > 0) AS today_pending_count,
      (SELECT COALESCE(SUM(total_amount), 0) FROM sales
       WHERE YEAR(sale_date) = YEAR(CURDATE()) AND MONTH(sale_date) = MONTH(CURDATE())) AS monthly_sales,
      (SELECT COUNT(*) FROM sales
       WHERE YEAR(sale_date) = YEAR(CURDATE()) AND MONTH(sale_date) = MONTH(CURDATE())) AS monthly_sales_count,
      (SELECT COALESCE(SUM(si.profit_amount), 0)
       FROM sale_items si INNER JOIN sales s ON s.id = si.sale_id
       WHERE YEAR(s.sale_date) = YEAR(CURDATE()) AND MONTH(s.sale_date) = MONTH(CURDATE())) AS monthly_profit,
      (SELECT COALESCE(SUM(total_amount), 0) FROM sales) AS overall_revenue,
      (SELECT COUNT(*) FROM customers WHERE is_active = 1) AS total_customers,
      (SELECT COUNT(*) FROM products WHERE status = 'active') AS total_products,
      (SELECT COALESCE(SUM(current_stock), 0) FROM products WHERE status = 'active') AS total_stock,
      (SELECT COUNT(*) FROM products WHERE status = 'active' AND current_stock <= min_stock) AS low_stock,
      (SELECT COUNT(*) FROM sales WHERE pending_amount > 0) AS pending_bills
  `);

  return {
    today: {
      sales: Number(row?.today_sales ?? 0),
      salesCount: Number(row?.today_sales_count ?? 0),
      purchases: Number(row?.today_purchases ?? 0),
      purchaseCount: Number(row?.today_purchase_count ?? 0),
      profit: Number(row?.today_profit ?? 0),
      collection: Number(row?.today_collection ?? 0),
      pending: Number(row?.today_pending ?? 0),
      pendingCount: Number(row?.today_pending_count ?? 0),
    },
    monthly: {
      sales: Number(row?.monthly_sales ?? 0),
      salesCount: Number(row?.monthly_sales_count ?? 0),
      profit: Number(row?.monthly_profit ?? 0),
    },
    overall: {
      revenue: Number(row?.overall_revenue ?? 0),
    },
    totals: {
      customers: Number(row?.total_customers ?? 0),
      products: Number(row?.total_products ?? 0),
      stockUnits: Number(row?.total_stock ?? 0),
      lowStock: Number(row?.low_stock ?? 0),
      pendingBills: Number(row?.pending_bills ?? 0),
    },
  };
};

export const getDailySalesChart = async (days = 7) => {
  const rows = await query(
    `SELECT DATE(sale_date) AS label,
            COALESCE(SUM(total_amount), 0) AS sales,
            COUNT(*) AS count
     FROM sales
     WHERE sale_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     GROUP BY DATE(sale_date)
     ORDER BY label ASC`,
    [days - 1]
  );
  return rows.map((r) => ({
    label: r.label,
    sales: Number(r.sales),
    count: Number(r.count),
  }));
};

export const getMonthlySalesChart = async (months = 12) => {
  const rows = await query(
    `SELECT DATE_FORMAT(sale_date, '%b %Y') AS label,
            DATE_FORMAT(sale_date, '%Y-%m') AS sort_key,
            COALESCE(SUM(total_amount), 0) AS sales
     FROM sales
     WHERE sale_date >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
     GROUP BY DATE_FORMAT(sale_date, '%Y-%m'), DATE_FORMAT(sale_date, '%b %Y')
     ORDER BY sort_key ASC`,
    [months - 1]
  );
  return rows.map((r) => ({ label: r.label, sales: Number(r.sales) }));
};

export const getYearlySalesChart = async () => {
  const rows = await query(
    `SELECT YEAR(sale_date) AS label, COALESCE(SUM(total_amount), 0) AS sales
     FROM sales
     GROUP BY YEAR(sale_date)
     ORDER BY label ASC`
  );
  return rows.map((r) => ({ label: String(r.label), sales: Number(r.sales) }));
};

export const getProfitChart = async (days = 30) => {
  const rows = await query(
    `SELECT DATE(s.sale_date) AS label, COALESCE(SUM(si.profit_amount), 0) AS profit
     FROM sale_items si INNER JOIN sales s ON s.id = si.sale_id
     WHERE s.sale_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     GROUP BY DATE(s.sale_date)
     ORDER BY label ASC`,
    [days - 1]
  );
  return rows.map((r) => ({ label: r.label, profit: Number(r.profit) }));
};

export const getPurchaseVsSalesChart = async (months = 6) => {
  const rows = await query(
    `SELECT m.label, m.sort_key,
            COALESCE(s.sales, 0) AS sales,
            COALESCE(p.purchases, 0) AS purchases
     FROM (
       SELECT DATE_FORMAT(d, '%b %Y') AS label, DATE_FORMAT(d, '%Y-%m') AS sort_key
       FROM (
         SELECT DATE_SUB(CURDATE(), INTERVAL seq MONTH) AS d
         FROM (
           SELECT 0 AS seq UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
         ) seqs
       ) dates
     ) m
     LEFT JOIN (
       SELECT DATE_FORMAT(sale_date, '%Y-%m') AS ym, SUM(total_amount) AS sales
       FROM sales GROUP BY ym
     ) s ON s.ym = m.sort_key
     LEFT JOIN (
       SELECT DATE_FORMAT(purchase_date, '%Y-%m') AS ym, SUM(total_amount) AS purchases
       FROM purchases GROUP BY ym
     ) p ON p.ym = m.sort_key
     ORDER BY m.sort_key ASC`
  );
  return rows.map((r) => ({
    label: r.label,
    sales: Number(r.sales),
    purchases: Number(r.purchases),
  }));
};

export const getStockInOutChart = async (days = 14) => {
  const rows = await query(
    `SELECT DATE(created_at) AS label,
            COALESCE(SUM(CASE WHEN movement_type = 'in' THEN quantity ELSE 0 END), 0) AS stock_in,
            COALESCE(SUM(CASE WHEN movement_type = 'out' THEN quantity ELSE 0 END), 0) AS stock_out
     FROM stock_movements
     WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     GROUP BY DATE(created_at)
     ORDER BY label ASC`,
    [days - 1]
  );
  return rows.map((r) => ({
    label: r.label,
    stockIn: Number(r.stock_in),
    stockOut: Number(r.stock_out),
  }));
};

export const getTopProducts = async (limit = 5) => {
  const rows = await query(
    `SELECT p.name, p.sku,
            COALESCE(SUM(si.quantity), 0) AS quantity,
            COALESCE(SUM(si.total_amount), 0) AS revenue
     FROM sale_items si
     INNER JOIN products p ON p.id = si.product_id
     INNER JOIN sales s ON s.id = si.sale_id
     WHERE s.sale_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
     GROUP BY p.id, p.name, p.sku
     ORDER BY quantity DESC
     LIMIT ?`,
    [limit]
  );
  return rows.map((r) => ({
    name: r.name,
    sku: r.sku,
    quantity: Number(r.quantity),
    revenue: Number(r.revenue),
  }));
};

export const getTopCustomers = async (limit = 5) => {
  const rows = await query(
    `SELECT c.name, c.phone, c.village,
            COUNT(s.id) AS order_count,
            COALESCE(SUM(s.total_amount), 0) AS total_spent
     FROM sales s
     INNER JOIN customers c ON c.id = s.customer_id
     WHERE s.sale_date >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
     GROUP BY c.id, c.name, c.phone, c.village
     ORDER BY total_spent DESC
     LIMIT ?`,
    [limit]
  );
  return rows.map((r) => ({
    name: r.name,
    phone: r.phone,
    village: r.village,
    orderCount: Number(r.order_count),
    totalSpent: Number(r.total_spent),
  }));
};

export const getRecentSales = async (limit = 8) => {
  const rows = await query(
    `SELECT s.id, s.invoice_number, s.sale_date, s.total_amount, s.paid_amount,
            s.pending_amount, s.payment_status, c.name AS customer_name
     FROM sales s
     LEFT JOIN customers c ON c.id = s.customer_id
     ORDER BY s.sale_date DESC, s.id DESC
     LIMIT ?`,
    [limit]
  );
  return rows.map((r) => ({
    id: r.id,
    invoiceNumber: r.invoice_number,
    saleDate: r.sale_date,
    totalAmount: Number(r.total_amount),
    paidAmount: Number(r.paid_amount),
    pendingAmount: Number(r.pending_amount),
    paymentStatus: r.payment_status,
    customerName: r.customer_name || 'Walk-in',
  }));
};

export const getRecentActivities = async (limit = 10) => {
  const rows = await query(
    `SELECT al.id, al.action, al.entity_type, al.entity_id, al.details,
            al.created_at, u.full_name AS user_name
     FROM activity_logs al
     LEFT JOIN users u ON u.id = al.user_id
     ORDER BY al.created_at DESC
     LIMIT ?`,
    [limit]
  );
  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    entityType: r.entity_type,
    entityId: r.entity_id,
    details: r.details ? (typeof r.details === 'string' ? JSON.parse(r.details) : r.details) : null,
    userName: r.user_name || 'System',
    createdAt: r.created_at,
  }));
};

export const getSalesChartFiltered = async ({ period, dateFrom, dateTo } = {}) => {
  const config = resolveChartConfig(period, dateFrom, dateTo);
  const dateWhere = buildDateWhere(config, 'sale_date');
  const group = buildGroupSelect(config.grouping, 'sale_date');

  const rows = await query(
    `SELECT ${group.labelExpr} AS label,
            ${group.sortExpr} AS sort_key,
            COALESCE(SUM(total_amount), 0) AS sales,
            COUNT(*) AS count
     FROM sales
     WHERE 1=1 ${dateWhere.clause}
     GROUP BY ${group.groupExpr}, ${group.labelExpr}
     ORDER BY sort_key ASC`,
    dateWhere.params
  );

  return rows.map((r) => ({
    label: String(r.label),
    sales: Number(r.sales),
    count: Number(r.count),
  }));
};

export const getProfitChartFiltered = async ({ period, dateFrom, dateTo } = {}) => {
  const config = resolveChartConfig(period, dateFrom, dateTo);
  const dateWhere = buildDateWhere(config, 's.sale_date');
  const group = buildGroupSelect(config.grouping, 's.sale_date');

  const rows = await query(
    `SELECT ${group.labelExpr} AS label,
            ${group.sortExpr} AS sort_key,
            COALESCE(SUM(si.profit_amount), 0) AS profit,
            COALESCE(SUM(si.total_amount), 0) AS revenue
     FROM sale_items si
     INNER JOIN sales s ON s.id = si.sale_id
     WHERE 1=1 ${dateWhere.clause}
     GROUP BY ${group.groupExpr}, ${group.labelExpr}
     ORDER BY sort_key ASC`,
    dateWhere.params
  );

  return rows.map((r) => ({
    label: String(r.label),
    profit: Number(r.profit),
    revenue: Number(r.revenue),
  }));
};

export const getPurchaseVsSalesChartFiltered = async ({ period, dateFrom, dateTo } = {}) => {
  const config = resolveChartConfig(period, dateFrom, dateTo);
  const salesDateWhere = buildDateWhere(config, 'sale_date');
  const purchaseDateWhere = buildDateWhere(config, 'purchase_date');
  const salesGroup = buildGroupSelect(config.grouping, 'sale_date');
  const purchaseGroup = buildGroupSelect(config.grouping, 'purchase_date');

  const [salesRows, purchaseRows] = await Promise.all([
    query(
      `SELECT ${salesGroup.groupExpr} AS group_key,
              ${salesGroup.labelExpr} AS label,
              COALESCE(SUM(total_amount), 0) AS sales
       FROM sales
       WHERE 1=1 ${salesDateWhere.clause}
       GROUP BY ${salesGroup.groupExpr}, ${salesGroup.labelExpr}`,
      salesDateWhere.params
    ),
    query(
      `SELECT ${purchaseGroup.groupExpr} AS group_key,
              COALESCE(SUM(total_amount), 0) AS purchases
       FROM purchases
       WHERE 1=1 ${purchaseDateWhere.clause}
       GROUP BY ${purchaseGroup.groupExpr}`,
      purchaseDateWhere.params
    ),
  ]);

  const purchaseMap = new Map(
    purchaseRows.map((row) => [String(row.group_key), Number(row.purchases)])
  );

  return salesRows
    .map((row) => ({
      label: String(row.label),
      sortKey: String(row.group_key),
      sales: Number(row.sales),
      purchases: purchaseMap.get(String(row.group_key)) ?? 0,
    }))
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .map(({ label, sales, purchases }) => ({ label, sales, purchases }));
};

export const getStockInOutChartFiltered = async ({ period, dateFrom, dateTo } = {}) => {
  const config = resolveChartConfig(period, dateFrom, dateTo);
  const dateWhere = buildDateWhere(config, 'created_at');
  const group = buildGroupSelect(config.grouping, 'created_at');

  const rows = await query(
    `SELECT ${group.labelExpr} AS label,
            ${group.sortExpr} AS sort_key,
            COALESCE(SUM(CASE WHEN movement_type = 'in' THEN quantity ELSE 0 END), 0) AS stock_in,
            COALESCE(SUM(CASE WHEN movement_type = 'out' THEN quantity ELSE 0 END), 0) AS stock_out
     FROM stock_movements
     WHERE 1=1 ${dateWhere.clause}
     GROUP BY ${group.groupExpr}, ${group.labelExpr}
     ORDER BY sort_key ASC`,
    dateWhere.params
  );

  return rows.map((r) => ({
    label: String(r.label),
    stockIn: Number(r.stock_in),
    stockOut: Number(r.stock_out),
  }));
};

export const getTopProductsFiltered = async ({ period, dateFrom, dateTo, limit = 8 } = {}) => {
  const config = resolveChartConfig(period, dateFrom, dateTo);
  const dateWhere = buildDateWhere(config, 's.sale_date');

  const rows = await query(
    `SELECT p.name, p.sku,
            COALESCE(SUM(si.quantity), 0) AS quantity,
            COALESCE(SUM(si.total_amount), 0) AS revenue
     FROM sale_items si
     INNER JOIN products p ON p.id = si.product_id
     INNER JOIN sales s ON s.id = si.sale_id
     WHERE 1=1 ${dateWhere.clause}
     GROUP BY p.id, p.name, p.sku
     ORDER BY quantity DESC
     LIMIT ?`,
    [...dateWhere.params, limit]
  );

  return rows.map((r) => ({
    name: r.name,
    sku: r.sku,
    quantity: Number(r.quantity),
    revenue: Number(r.revenue),
  }));
};

export const getTopCustomersFiltered = async ({ period, dateFrom, dateTo, limit = 8 } = {}) => {
  const config = resolveChartConfig(period, dateFrom, dateTo);
  const dateWhere = buildDateWhere(config, 's.sale_date');

  const rows = await query(
    `SELECT c.name, c.phone, c.village,
            COUNT(s.id) AS order_count,
            COALESCE(SUM(s.total_amount), 0) AS total_spent
     FROM sales s
     INNER JOIN customers c ON c.id = s.customer_id
     WHERE 1=1 ${dateWhere.clause}
     GROUP BY c.id, c.name, c.phone, c.village
     ORDER BY total_spent DESC
     LIMIT ?`,
    [...dateWhere.params, limit]
  );

  return rows.map((r) => ({
    name: r.name,
    phone: r.phone,
    village: r.village,
    orderCount: Number(r.order_count),
    totalSpent: Number(r.total_spent),
  }));
};
