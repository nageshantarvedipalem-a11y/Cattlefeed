import api from './api';

export const authService = {
  login: (identifier, password) =>
    api.post('/auth/login', { identifier, password }),

  me: () => api.get('/auth/me'),

  logout: () => api.post('/auth/logout'),

  forgotPassword: (email) =>
    api.post('/auth/forgot-password', { email }),

  resetPassword: (token, password, confirmPassword) =>
    api.post('/auth/reset-password', { token, password, confirmPassword }),

  changePassword: (currentPassword, newPassword, confirmPassword) =>
    api.post('/auth/change-password', {
      currentPassword,
      newPassword,
      confirmPassword,
    }),
};

export default authService;
