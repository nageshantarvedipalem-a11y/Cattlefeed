import api from './api';

export const stockService = {
  getPurchases: (params) => api.get('/stock/purchases', { params }),

  getPurchase: (id) => api.get(`/stock/purchases/${id}`),

  createPurchase: (data) => api.post('/stock/purchases', data),

  createAdjustment: (data) => api.post('/stock/adjustments', data),

  getHistory: (params) => api.get('/stock/history', { params }),

  getProductHistory: (productId, params) => api.get(`/stock/history/product/${productId}`, { params }),

  getLowStock: (params) => api.get('/stock/low-stock', { params }),

  exportHistory: (params) => api.get('/stock/history/export', {
    params,
    responseType: 'blob',
  }),

  exportLowStock: (params) => api.get('/stock/low-stock/export', {
    params,
    responseType: 'blob',
  }),
};

export default stockService;
