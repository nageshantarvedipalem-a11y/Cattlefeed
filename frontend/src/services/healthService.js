import api from './api';

export const healthService = {
  check: () => api.get('/health'),
};

export default healthService;
