import stockService from '../services/stock.service.js';
import { asyncHandler, sendSuccess, sendPaginated } from '../utils/apiResponse.js';
import { getClientIp } from '../middlewares/validate.middleware.js';

export const listPurchases = asyncHandler(async (req, res) => {
  const result = await stockService.listPurchases(req.query);
  sendPaginated(res, result.purchases, result.pagination, 'Purchases fetched successfully');
});

export const getPurchase = asyncHandler(async (req, res) => {
  const result = await stockService.getPurchaseById(req.params.id);
  sendSuccess(res, result, 'Purchase fetched successfully');
});

export const createPurchase = asyncHandler(async (req, res) => {
  const result = await stockService.createPurchase(req.user, req.body, getClientIp(req));
  sendSuccess(res, result, 'Stock-in entry created successfully', 201);
});

export const createAdjustment = asyncHandler(async (req, res) => {
  const result = await stockService.createAdjustment(req.user, req.body, getClientIp(req));
  sendSuccess(res, result, 'Stock adjustment completed successfully', 201);
});

export const listStockHistory = asyncHandler(async (req, res) => {
  const result = await stockService.listStockHistory(req.query);
  sendPaginated(res, result.movements, result.pagination, 'Stock history fetched successfully');
});

export const getProductStockHistory = asyncHandler(async (req, res) => {
  const result = await stockService.getProductStockHistory(req.params.productId, req.query);
  sendSuccess(res, result, 'Product stock history fetched successfully');
});

export const listLowStock = asyncHandler(async (req, res) => {
  const result = await stockService.listLowStock(req.query);
  sendPaginated(res, result.products, result.pagination, 'Low stock products fetched successfully');
});

export const exportStockHistory = asyncHandler(async (req, res) => {
  const format = req.query.format === 'pdf' ? 'pdf' : 'excel';
  const result = await stockService.exportStockHistory(req.query, format);
  res.setHeader('Content-Type', result.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
  res.send(result.buffer);
});

export const exportLowStock = asyncHandler(async (req, res) => {
  const format = req.query.format === 'pdf' ? 'pdf' : 'excel';
  const result = await stockService.exportLowStock(format);
  res.setHeader('Content-Type', result.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
  res.send(result.buffer);
});
