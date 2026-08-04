import cashBookService from '../services/cashBook.service.js';
import { asyncHandler, sendSuccess } from '../utils/apiResponse.js';
import { getClientIp } from '../middlewares/validate.middleware.js';

export const getCashBook = asyncHandler(async (req, res) => {
  const result = await cashBookService.getCashBook(req.query);
  sendSuccess(res, result, 'Cash book fetched successfully');
});

export const createEntry = asyncHandler(async (req, res) => {
  const result = await cashBookService.createEntry(req.user, req.body, getClientIp(req));
  sendSuccess(res, result, 'Cash book entry created successfully', 201);
});

export const exportCashBook = asyncHandler(async (req, res) => {
  const format = req.query.format === 'pdf' ? 'pdf' : 'excel';
  const result = await cashBookService.exportCashBook(req.query, format);
  res.setHeader('Content-Type', result.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
  res.send(result.buffer);
});
