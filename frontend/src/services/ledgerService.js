import api from './api';

export const ledgerService = {
  getCustomerSummaries: (params) => api.get('/ledger/customers', { params }),

  getCustomerLedger: (customerId, params) => api.get(`/ledger/customers/${customerId}`, { params }),

  getEntries: (params) => api.get('/ledger/entries', { params }),

  createAdjustment: (data) => api.post('/ledger/adjustments', data),

  exportLedger: (customerId, params) => api.get(`/ledger/customers/${customerId}/export`, {
    params,
    responseType: 'blob',
  }),
};

export default ledgerService;
