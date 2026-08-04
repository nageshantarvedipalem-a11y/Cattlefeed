import api from './api';

export const cashBookService = {
  getCashBook: (params) => api.get('/cashbook', { params }),

  createEntry: (data) => api.post('/cashbook/entries', data),

  exportCashBook: (params) => api.get('/cashbook/export', {
    params,
    responseType: 'blob',
  }),
};

export default cashBookService;
