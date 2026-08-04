import ledgerService from '../services/ledger.service.js';
import { asyncHandler, sendSuccess, sendPaginated } from '../utils/apiResponse.js';
import { getClientIp } from '../middlewares/validate.middleware.js';

export const listCustomerSummaries = asyncHandler(async (req, res) => {
  const result = await ledgerService.listCustomerSummaries(req.query);
  sendPaginated(res, result.summaries, result.pagination, 'Customer ledger summaries fetched successfully');
});

export const getCustomerLedger = asyncHandler(async (req, res) => {
  const result = await ledgerService.getCustomerLedger(req.params.customerId, req.query);
  sendSuccess(res, result, 'Customer ledger fetched successfully');
});

export const listEntries = asyncHandler(async (req, res) => {
  const result = await ledgerService.listEntries(req.query);
  sendPaginated(res, result.entries, result.pagination, 'Ledger entries fetched successfully');
});

export const createAdjustment = asyncHandler(async (req, res) => {
  const result = await ledgerService.createAdjustment(req.user, req.body, getClientIp(req));
  sendSuccess(res, result, 'Ledger adjustment created successfully', 201);
});

export const exportCustomerLedger = asyncHandler(async (req, res) => {
  const format = req.query.format === 'pdf' ? 'pdf' : 'excel';
  const result = await ledgerService.exportLedger(req.params.customerId, req.query, format);
  res.setHeader('Content-Type', result.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
  res.send(result.buffer);
});
