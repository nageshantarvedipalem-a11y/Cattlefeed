import { param, query } from 'express-validator';

const REPORT_TYPES = ['summary', 'sales', 'purchases', 'profit', 'customers', 'stock', 'payments'];

export const reportTypeValidation = [
  param('type').isIn(REPORT_TYPES).withMessage('Valid report type is required'),
];

export const reportFiltersValidation = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('sortBy').optional().isString(),
  query('sortOrder').optional().isIn(['asc', 'desc']),
  query('period').optional().isIn(['daily', 'monthly', 'yearly']),
  query('dateFrom').optional().isISO8601().toDate(),
  query('dateTo').optional().isISO8601().toDate(),
];

export const exportValidation = [
  query('format').optional().isIn(['excel', 'pdf']),
  ...reportTypeValidation,
  ...reportFiltersValidation,
];
