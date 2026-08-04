import billingService from '../services/billing.service.js';
import { asyncHandler, sendSuccess, sendPaginated } from '../utils/apiResponse.js';
import { getClientIp } from '../middlewares/validate.middleware.js';

export const searchProducts = asyncHandler(async (req, res) => {
  const result = await billingService.searchProducts(req.query);
  sendSuccess(res, result, 'Products fetched successfully');
});

export const listSales = asyncHandler(async (req, res) => {
  const result = await billingService.listSales(req.query);
  sendPaginated(res, result.sales, result.pagination, 'Sales fetched successfully');
});

export const getSale = asyncHandler(async (req, res) => {
  const result = await billingService.getSaleById(req.params.id);
  sendSuccess(res, result, 'Sale fetched successfully');
});

export const createSale = asyncHandler(async (req, res) => {
  const result = await billingService.createSale(req.user, req.body, getClientIp(req));
  sendSuccess(res, result, 'Bill created successfully', 201);
});

export const downloadInvoice = asyncHandler(async (req, res) => {
  const result = await billingService.downloadInvoicePdf(req.params.id);
  res.setHeader('Content-Type', result.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
  res.send(result.buffer);
});
