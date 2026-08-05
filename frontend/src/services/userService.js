import api from './api';
import { getCached, invalidateCache, setCached } from '../utils/apiCache';

export const userService = {
  getRoles: async () => {
    const cacheKey = 'users:roles';
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const response = await api.get('/users/roles');
    setCached(cacheKey, response, 5 * 60 * 1000);
    return response;
  },

  getUsers: async (params) => {
    const cacheKey = `users:list:${JSON.stringify(params)}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const response = await api.get('/users', { params });
    setCached(cacheKey, response, 30000);
    return response;
  },

  getUser: (id) => api.get(`/users/${id}`),

  createUser: async (data) => {
    const response = await api.post('/users', data);
    invalidateCache('users:');
    return response;
  },

  updateUser: async (id, data) => {
    const response = await api.put(`/users/${id}`, data);
    invalidateCache('users:');
    return response;
  },

  updateStatus: async (id, isActive) => {
    const response = await api.patch(`/users/${id}/status`, { isActive });
    invalidateCache('users:');
    return response;
  },

  deleteUser: async (id) => {
    const response = await api.delete(`/users/${id}`);
    invalidateCache('users:');
    return response;
  },
};

export default userService;
