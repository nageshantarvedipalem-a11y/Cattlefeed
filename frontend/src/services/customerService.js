import api from './api';

export const customerService = {
  getVillages: () => api.get('/customers/villages'),

  getCustomers: (params) => api.get('/customers', { params }),

  getCustomer: (id) => api.get(`/customers/${id}`),

  getSales: (id, params) => api.get(`/customers/${id}/sales`, { params }),

  getLedger: (id, params) => api.get(`/customers/${id}/ledger`, { params }),

  createCustomer: (data) => api.post('/customers', data),

  updateCustomer: (id, data) => api.put(`/customers/${id}`, data),

  updateStatus: (id, isActive) => api.patch(`/customers/${id}/status`, { isActive }),

  deleteCustomer: (id) => api.delete(`/customers/${id}`),
};

export default customerService;
