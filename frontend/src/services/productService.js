import api from './api';

export const productService = {
  getProducts: (params) => api.get('/products', { params }),

  getProductMeta: () => api.get('/products/meta'),

  getProduct: (id) => api.get(`/products/${id}`),

  createProduct: (data) => api.post('/products', data),

  updateProduct: (id, data) => api.put(`/products/${id}`, data),

  updateStatus: (id, status) => api.patch(`/products/${id}/status`, { status }),

  deleteProduct: (id) => api.delete(`/products/${id}`),
};

export default productService;
