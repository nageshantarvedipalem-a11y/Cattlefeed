import api from './api';

export const billingService = {
  getStockBatches: (params) => api.get('/billing/stock-batches', { params }),

  getStockBatchProducts: (purchaseId, params) =>
    api.get(`/billing/stock-batches/${purchaseId}/products`, { params }),

  searchProducts: (params) => api.get('/billing/products/search', { params }),

  getSales: (params) => api.get('/billing/sales', { params }),

  getSale: (id) => api.get(`/billing/sales/${id}`),

  createSale: (data) => api.post('/billing/sales', data),

  downloadInvoice: (id, thermal = false) =>
    api.get(`/billing/sales/${id}/invoice`, {
      params: { format: thermal ? 'thermal' : 'standard' },
      responseType: 'blob',
    }),
};

export default billingService;
