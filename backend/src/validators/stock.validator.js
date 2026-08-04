import { body, param, query } from 'express-validator';

export const listPurchasesValidation = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('sortBy').optional().isIn(['id', 'invoiceNumber', 'purchaseDate', 'totalAmount', 'paidAmount', 'paymentStatus', 'createdAt', 'supplierName']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
  query('supplierId').optional().isInt({ min: 1 }),
  query('paymentStatus').optional().isIn(['paid', 'partial', 'pending']),
  query('dateFrom').optional().isISO8601().toDate(),
  query('dateTo').optional().isISO8601().toDate(),
];

export const purchaseIdValidation = [
  param('id').isInt({ min: 1 }).withMessage('Valid purchase ID is required'),
];

export const purchaseItemValidation = body('items')
  .isArray({ min: 1 })
  .withMessage('At least one product item is required');

export const createPurchaseValidation = [
  body('supplierId').isInt({ min: 1 }).withMessage('Valid supplier is required'),
  body('invoiceNumber').optional({ values: 'falsy' }).trim().isLength({ max: 50 }),
  body('purchaseDate').isISO8601().toDate().withMessage('Valid purchase date is required'),
  body('discountAmount').optional().isFloat({ min: 0 }),
  body('paidAmount').optional().isFloat({ min: 0 }),
  body('remarks').optional({ values: 'falsy' }).trim(),
  body('items').isArray({ min: 1 }).withMessage('At least one product item is required'),
  body('items.*.productId').isInt({ min: 1 }).withMessage('Valid product is required'),
  body('items.*.quantity').isFloat({ gt: 0 }).withMessage('Quantity must be greater than 0'),
  body('items.*.purchasePrice').isFloat({ min: 0 }).withMessage('Purchase price must be 0 or greater'),
  body('items.*.sellingPrice').isFloat({ min: 0 }).withMessage('Selling price must be 0 or greater'),
  body('items.*.gstRate').optional().isFloat({ min: 0, max: 100 }),
];

export const createAdjustmentValidation = [
  body('productId').isInt({ min: 1 }).withMessage('Valid product is required'),
  body('movementType').isIn(['in', 'out']).withMessage('Movement type must be in or out'),
  body('quantity').isFloat({ gt: 0 }).withMessage('Quantity must be greater than 0'),
  body('remarks').optional({ values: 'falsy' }).trim(),
];

export const listStockHistoryValidation = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('sortOrder').optional().isIn(['asc', 'desc']),
  query('productId').optional().isInt({ min: 1 }),
  query('movementType').optional().isIn(['in', 'out', 'adjustment']),
  query('referenceType').optional().isIn(['purchase', 'sale', 'adjustment', 'return']),
  query('period').optional().isIn(['daily', 'monthly', 'yearly']),
  query('dateFrom').optional().isISO8601().toDate(),
  query('dateTo').optional().isISO8601().toDate(),
];

export const productIdParamValidation = [
  param('productId').isInt({ min: 1 }).withMessage('Valid product ID is required'),
];

export const exportValidation = [
  query('format').optional().isIn(['excel', 'pdf']),
  ...listStockHistoryValidation,
];
