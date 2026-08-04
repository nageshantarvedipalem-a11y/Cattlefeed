import { body, param, query } from 'express-validator';

export const listSummariesValidation = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('sortBy').optional().isIn(['name', 'village', 'currentBalance', 'pendingAmount']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
  query('village').optional().trim(),
];

export const ledgerFiltersValidation = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('sortOrder').optional().isIn(['asc', 'desc']),
  query('customerId').optional().isInt({ min: 1 }),
  query('transactionType').optional().isIn(['opening', 'sale', 'payment', 'adjustment', 'refund']),
  query('period').optional().isIn(['daily', 'monthly', 'yearly']),
  query('dateFrom').optional().isISO8601().toDate(),
  query('dateTo').optional().isISO8601().toDate(),
];

export const customerIdValidation = [
  param('customerId').isInt({ min: 1 }).withMessage('Valid customer ID is required'),
];

export const createAdjustmentValidation = [
  body('customerId').isInt({ min: 1 }).withMessage('Valid customer is required'),
  body('adjustmentType').isIn(['debit', 'credit']).withMessage('Type must be debit or credit'),
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than 0'),
  body('transactionDate').optional().isISO8601().toDate(),
  body('remarks').optional({ values: 'falsy' }).trim(),
];

export const exportValidation = [
  ...customerIdValidation,
  query('format').optional().isIn(['excel', 'pdf']),
  ...ledgerFiltersValidation.filter((v) => !v.optional || true),
];
