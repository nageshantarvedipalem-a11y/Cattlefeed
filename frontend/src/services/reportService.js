import api from './api';

export const reportService = {
  getReport: (type, params) => api.get(`/reports/${type}`, { params }),

  exportReport: (type, params) => api.get(`/reports/${type}/export`, {
    params,
    responseType: 'blob',
  }),
};

export default reportService;
