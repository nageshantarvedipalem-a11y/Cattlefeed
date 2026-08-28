import api from './api';

export const cashBookService = {
  getCashBook: (params) => api.get('/cashbook', { params }),

  getBalance: (params) => api.get('/cashbook/balance', { params }),

  getDailyReport: (params) => api.get('/cashbook/daily-report', { params }),

  getMonthlySummary: (params) => api.get('/cashbook/monthly-summary', { params }),

  createEntry: (data) => api.post('/cashbook/entries', data),

  updateEntry: (entryId, data) => api.put(`/cashbook/entries/${entryId}`, data),

  deleteEntry: (entryId) => api.delete(`/cashbook/entries/${entryId}`),

  setOpeningBalance: (data) => api.post('/cashbook/opening-balance', data),

  exportCashBook: (params) => api.get('/cashbook/export', {
    params,
    responseType: 'blob',
  }),
};

export default cashBookService;
