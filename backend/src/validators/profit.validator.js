import { query } from 'express-validator';

export const profitFiltersValidation = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('sortBy').optional().isIn(['saleDate', 'profitAmount', 'totalAmount', 'productName', 'invoiceNumber']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
  query('period').optional().isIn(['daily', 'monthly', 'yearly']),
  query('dateFrom').optional().isISO8601().toDate(),
  query('dateTo').optional().isISO8601().toDate(),
];

export const exportValidation = [
  query('format').optional().isIn(['excel', 'pdf']),
  ...profitFiltersValidation,
];
