import api from './api';

export const supplierService = {
  getSuppliers: (params) => api.get('/suppliers', { params }),

  getSupplier: (id) => api.get(`/suppliers/${id}`),

  getPurchases: (id, params) => api.get(`/suppliers/${id}/purchases`, { params }),

  createSupplier: (data) => api.post('/suppliers', data),

  updateSupplier: (id, data) => api.put(`/suppliers/${id}`, data),

  updateStatus: (id, isActive) => api.patch(`/suppliers/${id}/status`, { isActive }),

  paySupplier: (id, data) => api.post(`/suppliers/${id}/payments`, data),
};

export default supplierService;
