import { body, param, query } from 'express-validator';
import { validateIndianMobile } from '../utils/phoneValidation.js';

export const searchProductsValidation = [
  query('search').optional().trim(),
  query('barcode').optional().trim(),
];

export const stockBatchSearchValidation = [
  query('search').optional().trim(),
];

export const stockBatchProductsValidation = [
  param('purchaseId').isInt({ min: 1 }).withMessage('Valid stock batch ID is required'),
  query('search').optional().trim(),
  query('barcode').optional().trim(),
];

export const listSalesValidation = [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('sortBy').optional().isIn(['id', 'invoiceNumber', 'saleDate', 'totalAmount', 'paidAmount', 'pendingAmount', 'paymentStatus', 'createdAt', 'customerName']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
  query('customerId').optional().isInt({ min: 1 }),
  query('paymentStatus').optional().isIn(['paid', 'partial', 'pending']),
  query('dateFrom').optional().isISO8601().toDate(),
  query('dateTo').optional().isISO8601().toDate(),
];

export const saleIdValidation = [
  param('id').isInt({ min: 1 }).withMessage('Valid sale ID is required'),
];

export const createSaleValidation = [
  body('customerId').optional({ nullable: true }).isInt({ min: 1 }),
  body('customer.name').optional().trim().isLength({ min: 1, max: 150 }),
  body('customer.phone')
    .optional()
    .trim()
    .custom((value) => {
      if (!value) return true;
      const result = validateIndianMobile(value);
      if (!result.valid) throw new Error(result.error);
      return true;
    }),
  body('customer.village').optional({ values: 'falsy' }).trim(),
  body('customer.address').optional({ values: 'falsy' }).trim(),
  body('customer.notes').optional({ values: 'falsy' }).trim(),
  body('saleDate').optional().isISO8601().toDate(),
  body('discountAmount').optional().isFloat({ min: 0 }),
  body('dueDate').optional({ nullable: true }).isISO8601().toDate(),
  body('remarks').optional({ values: 'falsy' }).trim(),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.productId').isInt({ min: 1 }),
  body('items.*.quantity').isFloat({ gt: 0 }),
  body('items.*.sellingPrice').optional().isFloat({ min: 0 }),
  body('items.*.discountAmount').optional().isFloat({ min: 0 }),
  body('items.*.gstRate').optional().isFloat({ min: 0, max: 100 }),
  body('payments').isArray({ min: 1 }).withMessage('At least one payment is required'),
  body('payments.*.paymentMethod').isIn(['cash', 'upi', 'card', 'bank', 'credit']),
  body('payments.*.amount').isFloat({ gt: 0 }),
  body('payments.*.referenceNumber').optional({ values: 'falsy' }).trim(),
];
