import { body, query } from 'express-validator';

export const listCashBookValidation = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('sortOrder').optional().isIn(['asc', 'desc']),
  query('transactionType').optional().isIn(['cash_in', 'cash_out', 'income', 'expense', 'transfer']),
  query('paymentMethod').optional().isIn(['cash', 'upi', 'card', 'bank']),
  query('period').optional().isIn(['daily', 'monthly', 'yearly']),
  query('dateFrom').optional().isISO8601().toDate(),
  query('dateTo').optional().isISO8601().toDate(),
];

export const createEntryValidation = [
  body('transactionType').isIn(['cash_in', 'cash_out', 'expense', 'transfer']).withMessage('Valid transaction type is required'),
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than 0'),
  body('paymentMethod').isIn(['cash', 'upi', 'card', 'bank']).withMessage('Valid payment method is required'),
  body('category').optional({ values: 'falsy' }).trim().isLength({ max: 100 }),
  body('transactionDate').optional().isISO8601().toDate(),
  body('remarks').optional({ values: 'falsy' }).trim(),
];

export const exportValidation = [
  query('format').optional().isIn(['excel', 'pdf']),
  ...listCashBookValidation,
];
