import paymentService from '../services/payment.service.js';
import { asyncHandler, sendSuccess } from '../utils/apiResponse.js';
import { getClientIp } from '../middlewares/validate.middleware.js';

export const getPendingPayments = asyncHandler(async (req, res) => {
  const result = await paymentService.getPendingPayments(req.query);
  sendSuccess(res, result, 'Pending payments fetched successfully');
});

export const getPaymentHistory = asyncHandler(async (req, res) => {
  const result = await paymentService.getPaymentHistory(req.query);
  sendSuccess(res, result, 'Payment history fetched successfully');
});

export const getPaymentById = asyncHandler(async (req, res) => {
  const result = await paymentService.getPaymentById(req.params.paymentId);
  sendSuccess(res, result, 'Payment fetched successfully');
});

export const receivePayment = asyncHandler(async (req, res) => {
  const result = await paymentService.receivePayment(req.user, req.body, getClientIp(req));
  sendSuccess(res, result, 'Payment received successfully', 201);
});

export const downloadReceipt = asyncHandler(async (req, res) => {
  const result = await paymentService.downloadReceipt(req.params.paymentId);
  res.setHeader('Content-Type', result.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
  res.send(result.buffer);
});

export const getWhatsAppReminder = asyncHandler(async (req, res) => {
  const result = await paymentService.getWhatsAppReminder(req.params.saleId);
  sendSuccess(res, result, 'WhatsApp reminder link generated');
});

export const exportPendingPayments = asyncHandler(async (req, res) => {
  const format = req.query.format === 'pdf' ? 'pdf' : 'excel';
  const result = await paymentService.exportPendingPayments(req.query, format);
  res.setHeader('Content-Type', result.contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
  res.send(result.buffer);
});
