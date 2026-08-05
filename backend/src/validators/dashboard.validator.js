import { param, query } from 'express-validator';

export const chartKeyValidation = [
  param('chartKey').isIn([
    'sales',
    'profit',
    'purchaseVsSales',
    'stockInOut',
    'topProducts',
    'topCustomers',
  ]),
  query('period').optional().isIn(['daily', 'monthly', 'yearly']),
  query('dateFrom').optional().isISO8601().toDate(),
  query('dateTo').optional().isISO8601().toDate(),
];
