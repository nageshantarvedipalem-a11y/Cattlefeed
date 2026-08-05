import {
  getDashboardCards,
  getRecentSales,
  getRecentActivities,
  getSalesChartFiltered,
  getProfitChartFiltered,
  getPurchaseVsSalesChartFiltered,
  getStockInOutChartFiltered,
  getTopProductsFiltered,
  getTopCustomersFiltered,
} from '../repositories/dashboard.repository.js';

export class DashboardService {
  async getDashboard() {
    const [cards, recentSales, recentActivities] = await Promise.all([
      getDashboardCards(),
      getRecentSales(8),
      getRecentActivities(10),
    ]);

    return {
      cards,
      recentSales,
      recentActivities,
    };
  }

  async getChartData(chartKey, filters = {}) {
    const params = {
      period: filters.period || 'daily',
      dateFrom: filters.dateFrom || null,
      dateTo: filters.dateTo || null,
    };

    switch (chartKey) {
      case 'sales':
        return getSalesChartFiltered(params);
      case 'profit':
        return getProfitChartFiltered(params);
      case 'purchaseVsSales':
        return getPurchaseVsSalesChartFiltered(params);
      case 'stockInOut':
        return getStockInOutChartFiltered(params);
      case 'topProducts':
        return getTopProductsFiltered(params);
      case 'topCustomers':
        return getTopCustomersFiltered(params);
      default:
        throw new Error('Invalid chart key');
    }
  }
}

export default new DashboardService();
