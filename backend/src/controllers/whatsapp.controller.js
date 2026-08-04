import whatsappService from '../services/whatsapp.service.js';
import { asyncHandler, sendSuccess, sendPaginated } from '../utils/apiResponse.js';
import { getClientIp } from '../middlewares/validate.middleware.js';

export const getWhatsAppConfig = asyncHandler(async (req, res) => {
  const result = await whatsappService.getConfig();
  sendSuccess(res, result, 'WhatsApp settings fetched successfully');
});

export const updateWhatsAppConfig = asyncHandler(async (req, res) => {
  const result = await whatsappService.updateConfig(req.body);
  sendSuccess(res, result, 'WhatsApp settings updated successfully');
});

export const testWhatsAppConnection = asyncHandler(async (req, res) => {
  const result = await whatsappService.testConnection();
  sendSuccess(res, result, 'WhatsApp connection successful');
});

export const listWhatsAppMessages = asyncHandler(async (req, res) => {
  const result = await whatsappService.listMessages(req.query);
  sendPaginated(res, result.messages, result.pagination, 'WhatsApp messages fetched successfully');
});

export const sendInvoiceViaWhatsApp = asyncHandler(async (req, res) => {
  const result = await whatsappService.sendInvoice(
    req.params.saleId,
    req.user,
    getClientIp(req)
  );
  sendSuccess(res, result, 'Invoice sent via WhatsApp successfully');
});

export const sendReminderViaWhatsApp = asyncHandler(async (req, res) => {
  const result = await whatsappService.sendPaymentReminder(
    req.params.saleId,
    req.user,
    getClientIp(req)
  );
  sendSuccess(res, result, result.sent ? 'Payment reminder sent via WhatsApp' : 'WhatsApp link generated');
});

export const getReminderLink = asyncHandler(async (req, res) => {
  const result = await whatsappService.getReminderLink(req.params.saleId);
  sendSuccess(res, result, 'WhatsApp reminder link generated');
});
