import api from './api';

export const billingService = {
  searchProducts: (params) => api.get('/billing/products/search', { params }),

  getSales: (params) => api.get('/billing/sales', { params }),

  getSale: (id) => api.get(`/billing/sales/${id}`),

  createSale: (data) => api.post('/billing/sales', data),

  downloadInvoice: (id) => api.get(`/billing/sales/${id}/invoice`, { responseType: 'blob' }),
};

export default billingService;
