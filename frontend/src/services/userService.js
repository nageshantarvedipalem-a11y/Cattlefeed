import api from './api';

export const userService = {
  getRoles: () => api.get('/users/roles'),

  getUsers: (params) => api.get('/users', { params }),

  getUser: (id) => api.get(`/users/${id}`),

  createUser: (data) => api.post('/users', data),

  updateUser: (id, data) => api.put(`/users/${id}`, data),

  updateStatus: (id, isActive) => api.patch(`/users/${id}/status`, { isActive }),

  deleteUser: (id) => api.delete(`/users/${id}`),
};

export default userService;
