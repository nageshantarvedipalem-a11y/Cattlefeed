import cashBookService from '../services/cashBook.service.js';
import { asyncHandler, sendSuccess } from '../utils/apiResponse.js';
import { getClientIp } from '../middlewares/validate.middleware.js';

export const getCashBook = asyncHandler(async (req, res) => {
  const result = await cashBookService.getCashBook(req.query);
  sendSuccess(res, result, 'Cash book fetched successfully');
});

export const getBalance = asyncHandler(async (req, res) => {
  const result = await cashBookService.getBalance(req.query);
  sendSuccess(res, result, 'Cash balance fetched successfully');
});

export const getDailyReport = asyncHandler(async (req, res) => {
  const result = await cashBookService.getDailyReport(req.query);
  sendSuccess(res, result, 'Daily cash book report fetched successfully');
});

export const getMonthlySummary = asyncHandler(async (req, res) => {
  const result = await cashBookService.getMonthlySummary(req.query);
  sendSuccess(res, result, 'Monthly cash book summary fetched successfully');
});

export const createEntry = asyncHandler(async (req, res) => {
  const result = await cashBookService.createEntry(req.user, req.body, getClientIp(req));
  sendSuccess(res, result, 'Cash book entry created successfully', 201);
});

export const updateEntry = asyncHandler(async (req, res) => {
  const result = await cashBookService.updateEntry(req.user, req.params.entryId, req.body, getClientIp(req));
  sendSuccess(res, result, 'Cash book entry updated successfully');
});

export const deleteEntry = asyncHandler(async (req, res) => {
  const result = await cashBookService.deleteEntry(req.user, req.params.entryId, getClientIp(req));
  sendSuccess(res, result, 'Cash book entry deleted successfully');
});

export const setOpeningBalance = asyncHandler(async (req, res) => {
  const result = await cashBookService.setOpeningBalance(req.user, req.body, getClientIp(req));
  sendSuccess(res, result, 'Opening balance saved successfully');
});

export const exportCashBook = asyncHandler(async (req, res) => {
  const format = req.query.format === 'pdf' ? 'pdf' : 'excel';
  const result = await cashBookService.exportCashBook(req.query, format);
  res.setHeader('Content-Type', result.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
  res.send(result.buffer);
});
