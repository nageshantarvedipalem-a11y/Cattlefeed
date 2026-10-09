import { body, param, query } from 'express-validator';

export const pendingListValidation = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('sortBy').optional().isIn([
    'dueDate',
    'pendingAmount',
    'saleDate',
    'customerName',
    'invoiceNumber',
    'lastSaleDate',
    'invoiceCount',
    'totalAmount',
  ]),
  query('sortOrder').optional().isIn(['asc', 'desc']),
  query('overdueOnly').optional().isBoolean().toBoolean(),
  query('period').optional().isIn(['daily', 'monthly', 'yearly']),
  query('dateFrom').optional().isISO8601().toDate(),
  query('dateTo').optional().isISO8601().toDate(),
  query('customerId').optional().isInt({ min: 1 }).toInt(),
];

export const pendingCustomerValidation = [
  param('customerId').isInt({ min: 1 }).withMessage('Valid customer ID is required'),
];

export const paymentHistoryValidation = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('sortOrder').optional().isIn(['asc', 'desc']),
  query('period').optional().isIn(['daily', 'monthly', 'yearly']),
  query('dateFrom').optional().isISO8601().toDate(),
  query('dateTo').optional().isISO8601().toDate(),
  query('customerId').optional().isInt({ min: 1 }).toInt(),
  query('saleId').optional().isInt({ min: 1 }).toInt(),
];

export const receivePaymentValidation = [
  body('saleId').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('Valid sale ID is required'),
  body('customerId').optional({ values: 'falsy' }).isInt({ min: 1 }).withMessage('Valid customer ID is required'),
  body().custom((_, { req }) => {
    if (!req.body?.saleId && !req.body?.customerId) {
      throw new Error('Sale or customer is required');
    }
    return true;
  }),
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than 0'),
  body('paymentMethod').isIn(['cash', 'upi', 'card', 'bank']).withMessage('Valid payment method is required'),
  body('paymentDate').optional().isISO8601().toDate(),
  body('referenceNumber').optional({ values: 'falsy' }).trim().isLength({ max: 100 }),
  body('remarks').optional({ values: 'falsy' }).trim(),
  body('sendUpdatedBill').optional(),
];

export const paymentIdValidation = [
  param('paymentId').isInt({ min: 1 }).withMessage('Valid payment ID is required'),
];

export const saleIdValidation = [
  param('saleId').isInt({ min: 1 }).withMessage('Valid sale ID is required'),
];

export const exportValidation = [
  query('format').optional().isIn(['excel', 'pdf']),
  ...pendingListValidation,
];
