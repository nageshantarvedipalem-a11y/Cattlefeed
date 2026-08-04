import api from './api';

export const whatsappService = {
  getSettings: () => api.get('/whatsapp/settings'),

  updateSettings: (data) => api.put('/whatsapp/settings', data),

  testConnection: () => api.post('/whatsapp/test'),

  getMessages: (params) => api.get('/whatsapp/messages', { params }),

  sendInvoice: (saleId) => api.post(`/whatsapp/invoice/${saleId}`),

  sendReminder: (saleId) => api.post(`/whatsapp/reminder/${saleId}`),

  getReminderLink: (saleId) => api.get(`/whatsapp/reminder/${saleId}/link`),
};

export default whatsappService;
