import api from './api';
import { getCached, setCached } from '../utils/apiCache';
import runQueued from '../utils/requestQueue';

export const dashboardService = {
  getDashboard: async () => {
    const cacheKey = 'dashboard:summary';
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const response = await api.get('/dashboard', { timeout: 60000 });
    setCached(cacheKey, response, 45000);
    return response;
  },

  getChartData: async (chartKey, params = {}) => {
    const cacheKey = `dashboard:chart:${chartKey}:${JSON.stringify(params)}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const response = await runQueued(() =>
      api.get(`/dashboard/charts/${chartKey}`, { params, timeout: 60000 })
    );
    setCached(cacheKey, response, 45000);
    return response;
  },
};

export default dashboardService;
