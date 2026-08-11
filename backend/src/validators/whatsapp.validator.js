import { body, param, query } from 'express-validator';

export const updateWhatsAppConfigValidation = [
  body('enabled').optional().isBoolean().toBoolean(),
  body('autoSendInvoice').optional().isBoolean().toBoolean(),
  body('provider').optional().isIn(['meta', 'aisensy']),
  body('apiToken').optional({ values: 'falsy' }).trim().isLength({ max: 500 }),
  body('phoneNumberId').optional({ values: 'falsy' }).trim().isLength({ max: 100 }),
  body('aisensyApiKey').optional({ values: 'falsy' }).trim().isLength({ max: 500 }),
  body('aisensyInvoiceCampaign').optional({ values: 'falsy' }).trim().isLength({ max: 200 }),
  body('aisensyReminderCampaign').optional({ values: 'falsy' }).trim().isLength({ max: 200 }),
];

export const listWhatsAppMessagesValidation = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('messageType').optional().isIn(['invoice', 'reminder', 'test', 'text']),
  query('status').optional().isIn(['sent', 'failed', 'pending']),
];

export const saleIdValidation = [
  param('saleId').isInt({ min: 1 }).withMessage('Valid sale ID is required'),
];
