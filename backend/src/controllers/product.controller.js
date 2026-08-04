import productService from '../services/product.service.js';
import { asyncHandler, sendSuccess, sendPaginated } from '../utils/apiResponse.js';
import { getClientIp } from '../middlewares/validate.middleware.js';

export const listProducts = asyncHandler(async (req, res) => {
  const result = await productService.listProducts(req.query);
  sendPaginated(res, result.products, result.pagination, 'Products fetched successfully');
});

export const getProductMeta = asyncHandler(async (req, res) => {
  const result = await productService.getProductMeta();
  sendSuccess(res, result, 'Product metadata fetched successfully');
});

export const getProduct = asyncHandler(async (req, res) => {
  const result = await productService.getProductById(req.params.id);
  sendSuccess(res, result, 'Product fetched successfully');
});

export const createProduct = asyncHandler(async (req, res) => {
  const result = await productService.createProduct(req.user, req.body, getClientIp(req));
  sendSuccess(res, result, 'Product created successfully', 201);
});

export const updateProduct = asyncHandler(async (req, res) => {
  const result = await productService.updateProduct(req.user, req.params.id, req.body, getClientIp(req));
  sendSuccess(res, result, 'Product updated successfully');
});

export const updateProductStatus = asyncHandler(async (req, res) => {
  const result = await productService.updateProductStatus(
    req.user,
    req.params.id,
    req.body.status,
    getClientIp(req)
  );
  sendSuccess(res, result, 'Product status updated successfully');
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const result = await productService.deleteProduct(req.user, req.params.id, getClientIp(req));
  sendSuccess(res, result, result.message);
});
