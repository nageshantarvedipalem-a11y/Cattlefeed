import { query } from '../../config/database.js';

export const getDashboardCards = async () => {
  const [
    todaySales,
    todayPurchases,
    todayProfit,
    todayCollection,
    todayPending,
    monthlySales,
    monthlyProfit,
    overallRevenue,
    totalCustomers,
    totalProducts,
    totalStock,
    lowStock,
    pendingBills,
  ] = await Promise.all([
    query(`SELECT COALESCE(SUM(total_amount), 0) AS total, COUNT(*) AS count
           FROM sales WHERE DATE(sale_date) = CURDATE()`),
    query(`SELECT COALESCE(SUM(total_amount), 0) AS total, COUNT(*) AS count
           FROM purchases WHERE DATE(purchase_date) = CURDATE()`),
    query(`SELECT COALESCE(SUM(si.profit_amount), 0) AS total
           FROM sale_items si INNER JOIN sales s ON s.id = si.sale_id
           WHERE DATE(s.sale_date) = CURDATE()`),
    query(`SELECT COALESCE(SUM(amount), 0) AS total
           FROM cash_book WHERE DATE(transaction_date) = CURDATE()
           AND transaction_type IN ('cash_in', 'income')`),
    query(`SELECT COALESCE(SUM(pending_amount), 0) AS total, COUNT(*) AS count
           FROM sales WHERE DATE(sale_date) = CURDATE() AND pending_amount > 0`),
    query(`SELECT COALESCE(SUM(total_amount), 0) AS total, COUNT(*) AS count
           FROM sales WHERE YEAR(sale_date) = YEAR(CURDATE()) AND MONTH(sale_date) = MONTH(CURDATE())`),
    query(`SELECT COALESCE(SUM(si.profit_amount), 0) AS total
           FROM sale_items si INNER JOIN sales s ON s.id = si.sale_id
           WHERE YEAR(s.sale_date) = YEAR(CURDATE()) AND MONTH(s.sale_date) = MONTH(CURDATE())`),
    query(`SELECT COALESCE(SUM(total_amount), 0) AS total FROM sales`),
    query(`SELECT COUNT(*) AS total FROM customers WHERE is_active = 1`),
    query(`SELECT COUNT(*) AS total FROM products WHERE status = 'active'`),
    query(`SELECT COALESCE(SUM(current_stock), 0) AS total FROM products WHERE status = 'active'`),
    query(`SELECT COUNT(*) AS total FROM products WHERE status = 'active' AND current_stock <= min_stock`),
    query(`SELECT COUNT(*) AS total FROM sales WHERE pending_amount > 0`),
  ]);

  return {
    today: {
      sales: Number(todaySales[0]?.total ?? 0),
      salesCount: Number(todaySales[0]?.count ?? 0),
      purchases: Number(todayPurchases[0]?.total ?? 0),
      purchaseCount: Number(todayPurchases[0]?.count ?? 0),
      profit: Number(todayProfit[0]?.total ?? 0),
      collection: Number(todayCollection[0]?.total ?? 0),
      pending: Number(todayPending[0]?.total ?? 0),
      pendingCount: Number(todayPending[0]?.count ?? 0),
    },
    monthly: {
      sales: Number(monthlySales[0]?.total ?? 0),
      salesCount: Number(monthlySales[0]?.count ?? 0),
      profit: Number(monthlyProfit[0]?.total ?? 0),
    },
    overall: {
      revenue: Number(overallRevenue[0]?.total ?? 0),
    },
    totals: {
      customers: Number(totalCustomers[0]?.total ?? 0),
      products: Number(totalProducts[0]?.total ?? 0),
      stockUnits: Number(totalStock[0]?.total ?? 0),
      lowStock: Number(lowStock[0]?.total ?? 0),
      pendingBills: Number(pendingBills[0]?.total ?? 0),
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
