import {
  getDashboardCards,
  getDailySalesChart,
  getMonthlySalesChart,
  getYearlySalesChart,
  getProfitChart,
  getPurchaseVsSalesChart,
  getStockInOutChart,
  getTopProducts,
  getTopCustomers,
  getRecentSales,
  getRecentActivities,
} from '../repositories/dashboard.repository.js';

export class DashboardService {
  async getDashboard() {
    const [
      cards,
      dailySales,
      monthlySales,
      yearlySales,
      profitTrend,
      purchaseVsSales,
      stockInOut,
      topProducts,
      topCustomers,
      recentSales,
      recentActivities,
    ] = await Promise.all([
      getDashboardCards(),
      getDailySalesChart(7),
      getMonthlySalesChart(12),
      getYearlySalesChart(),
      getProfitChart(30),
      getPurchaseVsSalesChart(6),
      getStockInOutChart(14),
      getTopProducts(5),
      getTopCustomers(5),
      getRecentSales(8),
      getRecentActivities(10),
    ]);

    return {
      cards,
      charts: {
        dailySales,
        monthlySales,
        yearlySales,
        profitTrend,
        purchaseVsSales,
        stockInOut,
        topProducts,
        topCustomers,
      },
      recentSales,
      recentActivities,
    };
  }
}

export default new DashboardService();
