import { body, param, query } from 'express-validator';

export const listCustomersValidation = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('sortBy').optional().isIn(['id', 'name', 'phone', 'village', 'openingBalance', 'creditLimit', 'isActive', 'createdAt', 'currentBalance']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
  query('isActive').optional().isIn(['true', 'false', '1', '0']),
];

export const customerIdValidation = [
  param('id').isInt({ min: 1 }).withMessage('Valid customer ID is required'),
];

export const createCustomerValidation = [
  body('name').trim().notEmpty().withMessage('Customer name is required').isLength({ max: 150 }),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .isLength({ max: 20 })
    .matches(/^[0-9+\-\s()]+$/)
    .withMessage('Invalid phone number format'),
  body('village').optional({ values: 'falsy' }).trim().isLength({ max: 100 }),
  body('address').optional({ values: 'falsy' }).trim(),
  body('openingBalance').optional().isFloat({ min: 0 }).withMessage('Opening balance must be 0 or greater'),
  body('openingBalanceType').optional().isIn(['debit', 'credit']).withMessage('Balance type must be debit or credit'),
  body('creditLimit').optional().isFloat({ min: 0 }).withMessage('Credit limit must be 0 or greater'),
  body('notes').optional({ values: 'falsy' }).trim(),
  body('isActive').optional().isBoolean(),
];

export const updateCustomerValidation = [
  ...customerIdValidation,
  body('name').optional().trim().notEmpty().isLength({ max: 150 }),
  body('phone')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .matches(/^[0-9+\-\s()]+$/)
    .withMessage('Invalid phone number format'),
  body('village').optional({ values: 'falsy' }).trim().isLength({ max: 100 }),
  body('address').optional({ values: 'falsy' }).trim(),
  body('openingBalance').optional().isFloat({ min: 0 }),
  body('openingBalanceType').optional().isIn(['debit', 'credit']),
  body('creditLimit').optional().isFloat({ min: 0 }),
  body('notes').optional({ values: 'falsy' }).trim(),
  body('isActive').optional().isBoolean(),
];

export const updateStatusValidation = [
  ...customerIdValidation,
  body('isActive').isBoolean().withMessage('isActive must be true or false'),
];
