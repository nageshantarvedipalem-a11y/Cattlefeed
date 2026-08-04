import { body, param, query } from 'express-validator';

export const listSuppliersValidation = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('sortBy').optional().isIn(['id', 'name', 'phone', 'gstNumber', 'openingBalance', 'isActive', 'createdAt', 'totalPurchases']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
  query('isActive').optional().isIn(['true', 'false', '1', '0']),
];

export const supplierIdValidation = [
  param('id').isInt({ min: 1 }).withMessage('Valid supplier ID is required'),
];

export const createSupplierValidation = [
  body('name').trim().notEmpty().withMessage('Supplier name is required').isLength({ max: 150 }),
  body('phone')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 20 })
    .matches(/^[0-9+\-\s()]*$/)
    .withMessage('Invalid phone number format'),
  body('address').optional({ values: 'falsy' }).trim(),
  body('gstNumber')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 20 })
    .matches(/^[0-9A-Z]*$/)
    .withMessage('Invalid GST number format'),
  body('openingBalance').optional().isFloat({ min: 0 }).withMessage('Opening balance must be 0 or greater'),
  body('notes').optional({ values: 'falsy' }).trim(),
  body('isActive').optional().isBoolean(),
];

export const updateSupplierValidation = [
  ...supplierIdValidation,
  body('name').optional().trim().notEmpty().isLength({ max: 150 }),
  body('phone')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 20 })
    .matches(/^[0-9+\-\s()]*$/)
    .withMessage('Invalid phone number format'),
  body('address').optional({ values: 'falsy' }).trim(),
  body('gstNumber')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 20 })
    .matches(/^[0-9A-Z]*$/)
    .withMessage('Invalid GST number format'),
  body('openingBalance').optional().isFloat({ min: 0 }),
  body('notes').optional({ values: 'falsy' }).trim(),
  body('isActive').optional().isBoolean(),
];

export const updateStatusValidation = [
  ...supplierIdValidation,
  body('isActive').isBoolean().withMessage('isActive must be true or false'),
];
