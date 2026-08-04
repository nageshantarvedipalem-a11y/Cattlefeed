import { body, param, query } from 'express-validator';

export const listProductsValidation = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('sortBy').optional().isIn([
    'id', 'name', 'sku', 'barcode', 'categoryName', 'brandName',
    'purchasePrice', 'sellingPrice', 'gstRate', 'currentStock', 'minStock', 'status', 'createdAt',
  ]),
  query('sortOrder').optional().isIn(['asc', 'desc']),
  query('categoryId').optional().isInt({ min: 1 }),
  query('brandId').optional().isInt({ min: 1 }),
  query('status').optional().isIn(['active', 'inactive', 'discontinued']),
  query('lowStock').optional().isIn(['true', 'false', '1', '0']),
];

export const productIdValidation = [
  param('id').isInt({ min: 1 }).withMessage('Valid product ID is required'),
];

export const createProductValidation = [
  body('name').trim().notEmpty().withMessage('Product name is required').isLength({ max: 200 }),
  body('sku').trim().notEmpty().withMessage('SKU is required').isLength({ max: 50 }),
  body('barcode')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 50 }),
  body('categoryId').optional({ values: 'falsy' }).isInt({ min: 1 }),
  body('brandId').optional({ values: 'falsy' }).isInt({ min: 1 }),
  body('purchasePrice').optional().isFloat({ min: 0 }).withMessage('Purchase price must be 0 or greater'),
  body('sellingPrice').optional().isFloat({ min: 0 }).withMessage('Selling price must be 0 or greater'),
  body('gstRate').optional().isFloat({ min: 0, max: 100 }).withMessage('GST rate must be between 0 and 100'),
  body('currentStock').optional().isFloat({ min: 0 }).withMessage('Current stock must be 0 or greater'),
  body('minStock').optional().isFloat({ min: 0 }).withMessage('Minimum stock must be 0 or greater'),
  body('status').optional().isIn(['active', 'inactive', 'discontinued']),
];

export const updateProductValidation = [
  ...productIdValidation,
  body('name').optional().trim().notEmpty().isLength({ max: 200 }),
  body('sku').optional().trim().notEmpty().isLength({ max: 50 }),
  body('barcode')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 50 }),
  body('categoryId').optional({ nullable: true }).custom((value) => {
    if (value === null || value === '') return true;
    return Number.isInteger(Number(value)) && Number(value) >= 1;
  }),
  body('brandId').optional({ nullable: true }).custom((value) => {
    if (value === null || value === '') return true;
    return Number.isInteger(Number(value)) && Number(value) >= 1;
  }),
  body('purchasePrice').optional().isFloat({ min: 0 }),
  body('sellingPrice').optional().isFloat({ min: 0 }),
  body('gstRate').optional().isFloat({ min: 0, max: 100 }),
  body('currentStock').optional().isFloat({ min: 0 }),
  body('minStock').optional().isFloat({ min: 0 }),
  body('status').optional().isIn(['active', 'inactive', 'discontinued']),
];

export const updateStatusValidation = [
  ...productIdValidation,
  body('status').isIn(['active', 'inactive', 'discontinued']).withMessage('Valid status is required'),
];
