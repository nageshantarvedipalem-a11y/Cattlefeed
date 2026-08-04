import api from './api';

export const paymentService = {
  getPendingPayments: (params) => api.get('/payments/pending', { params }),

  getPaymentHistory: (params) => api.get('/payments/history', { params }),

  receivePayment: (data) => api.post('/payments/receive', data),

  downloadReceipt: (paymentId) => api.get(`/payments/${paymentId}/receipt`, { responseType: 'blob' }),

  getWhatsAppReminder: (saleId) => api.get(`/payments/pending/${saleId}/whatsapp`),

  exportPendingPayments: (params) => api.get('/payments/pending/export', {
    params,
    responseType: 'blob',
  }),
};

export default paymentService;
