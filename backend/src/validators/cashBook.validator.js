import { body, param, query } from 'express-validator';

const periodValues = ['daily', 'yesterday', 'weekly', 'monthly', 'last_month', 'yearly'];
const methodValues = ['cash', 'upi', 'card', 'bank', 'other'];
const typeValues = ['cash_in', 'cash_out', 'income', 'expense', 'transfer'];
const sourceValues = ['billing', 'supplier_payment', 'manual', 'other', 'opening_balance'];

export const listCashBookValidation = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('sortOrder').optional().isIn(['asc', 'desc']),
  query('transactionType').optional().isIn(typeValues),
  query('bookSide').optional().isIn(['jama', 'karchulu']),
  query('paymentMethod').optional().isIn(methodValues),
  query('source').optional().isIn(sourceValues),
  query('category').optional().trim().isLength({ max: 100 }),
  query('period').optional().isIn(periodValues),
  query('dateFrom').optional().isISO8601().toDate(),
  query('dateTo').optional().isISO8601().toDate(),
];

const entryBody = [
  body('bookSide').optional().isIn(['jama', 'karchulu']),
  body('transactionType').optional().isIn(['cash_in', 'cash_out', 'expense', 'transfer']),
  body('amount').isFloat({ gt: 0 }).withMessage('Amount must be greater than 0'),
  body('paymentMethod').isIn(methodValues).withMessage('Valid payment method is required'),
  body('category').trim().notEmpty().withMessage('Category is required').isLength({ max: 100 }),
  body('description').trim().isLength({ min: 2, max: 255 }).withMessage('Description is required'),
  body('transactionDate').optional().isISO8601().toDate(),
  body('referenceNumber').optional({ values: 'falsy' }).trim().isLength({ max: 100 }),
  body('partyName').optional({ values: 'falsy' }).trim().isLength({ max: 150 }),
  body('remarks').optional({ values: 'falsy' }).trim(),
];

export const createEntryValidation = [
  ...entryBody,
  body().custom((_, { req }) => {
    if (!req.body.bookSide && !req.body.transactionType) {
      throw new Error('Transaction type is required');
    }
    return true;
  }),
];

export const updateEntryValidation = [
  param('entryId').isInt({ min: 1 }),
  body('bookSide').optional().isIn(['jama', 'karchulu']),
  body('transactionType').optional().isIn(['cash_in', 'cash_out', 'expense', 'transfer']),
  body('amount').optional().isFloat({ gt: 0 }).withMessage('Amount must be greater than 0'),
  body('paymentMethod').optional().isIn(methodValues),
  body('category').optional().trim().notEmpty().isLength({ max: 100 }),
  body('description').optional().trim().isLength({ min: 2, max: 255 }),
  body('transactionDate').optional().isISO8601().toDate(),
  body('referenceNumber').optional({ values: 'falsy' }).trim().isLength({ max: 100 }),
  body('partyName').optional({ values: 'falsy' }).trim().isLength({ max: 150 }),
  body('remarks').optional({ values: 'falsy' }).trim(),
];

export const entryIdValidation = [
  param('entryId').isInt({ min: 1 }).withMessage('Valid entry ID is required'),
];

export const openingBalanceValidation = [
  body('date').optional().isISO8601().toDate(),
  body('transactionDate').optional().isISO8601().toDate(),
  body('amount').isFloat({ min: 0 }).withMessage('Opening balance cannot be negative'),
  body('paymentMethod').optional().isIn(methodValues),
  body('remarks').optional({ values: 'falsy' }).trim(),
  body('description').optional({ values: 'falsy' }).trim(),
];

export const dailyReportValidation = [
  query('date').optional().isISO8601().toDate(),
];

export const monthlySummaryValidation = [
  query('year').optional().isInt({ min: 2000, max: 2100 }),
  query('month').optional().isInt({ min: 1, max: 12 }),
];

export const exportValidation = [
  query('format').optional().isIn(['excel', 'pdf']),
  ...listCashBookValidation,
];
