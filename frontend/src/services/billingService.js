import api from './api';

export const billingService = {
  getStockBatches: (params) => api.get('/billing/stock-batches', { params }),

  getStockBatchProducts: (purchaseId, params) =>
    api.get(`/billing/stock-batches/${purchaseId}/products`, { params }),

  searchProducts: (params) => api.get('/billing/products/search', { params }),

  getSales: (params) => api.get('/billing/sales', { params }),

  getSale: (id) => api.get(`/billing/sales/${id}`),

  createSale: (data) => api.post('/billing/sales', data),

  downloadInvoice: (id, format = 'standard') =>
    api.get(`/billing/sales/${id}/invoice`, {
      params: { format },
      responseType: format === 'html' ? 'text' : 'blob',
    }),
};

export default billingService;
