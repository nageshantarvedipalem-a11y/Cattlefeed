import api from './api';

export const dashboardService = {
  getDashboard: () => api.get('/dashboard'),
};

export default dashboardService;
