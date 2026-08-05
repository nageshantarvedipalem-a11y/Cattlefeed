import { Router } from 'express';
import * as billingController from '../controllers/billing.controller.js';
import { authenticate, authorizePermission } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  searchProductsValidation,
  stockBatchSearchValidation,
  stockBatchProductsValidation,
  listSalesValidation,
  saleIdValidation,
  createSaleValidation,
} from '../validators/billing.validator.js';

const router = Router();

router.use(authenticate);

router.get(
  '/stock-batches',
  authorizePermission('billing', 'view'),
  validate(stockBatchSearchValidation),
  billingController.listStockBatches
);

router.get(
  '/stock-batches/:purchaseId/products',
  authorizePermission('billing', 'view'),
  validate(stockBatchProductsValidation),
  billingController.listStockBatchProducts
);

router.get(
  '/products/search',
  authorizePermission('billing', 'view'),
  validate(searchProductsValidation),
  billingController.searchProducts
);

router.get(
  '/sales',
  authorizePermission('billing', 'view'),
  validate(listSalesValidation),
  billingController.listSales
);

router.get(
  '/sales/:id/invoice',
  authorizePermission('billing', 'view'),
  validate(saleIdValidation),
  billingController.downloadInvoice
);

router.get(
  '/sales/:id',
  authorizePermission('billing', 'view'),
  validate(saleIdValidation),
  billingController.getSale
);

router.post(
  '/sales',
  authorizePermission('billing', 'create'),
  validate(createSaleValidation),
  billingController.createSale
);

export default router;
