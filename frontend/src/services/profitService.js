import api from './api';

export const profitService = {
  getProfit: (params) => api.get('/profit', { params }),

  exportProfit: (params) => api.get('/profit/export', {
    params,
    responseType: 'blob',
  }),
};

export default profitService;
