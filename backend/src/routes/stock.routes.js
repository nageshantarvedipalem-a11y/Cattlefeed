import { query } from 'express-validator';
import { Router } from 'express';
import * as stockController from '../controllers/stock.controller.js';
import { authenticate, authorizePermission } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  listPurchasesValidation,
  purchaseIdValidation,
  createPurchaseValidation,
  createAdjustmentValidation,
  listStockHistoryValidation,
  productIdParamValidation,
  exportValidation,
} from '../validators/stock.validator.js';

const router = Router();

router.use(authenticate);

router.get(
  '/purchases',
  authorizePermission('stock', 'view'),
  validate(listPurchasesValidation),
  stockController.listPurchases
);

router.get(
  '/purchases/:id',
  authorizePermission('stock', 'view'),
  validate(purchaseIdValidation),
  stockController.getPurchase
);

router.post(
  '/purchases',
  authorizePermission('stock', 'create'),
  validate(createPurchaseValidation),
  stockController.createPurchase
);

router.post(
  '/adjustments',
  authorizePermission('stock', 'edit'),
  validate(createAdjustmentValidation),
  stockController.createAdjustment
);

router.get(
  '/history/export',
  authorizePermission('stock', 'view'),
  validate(exportValidation),
  stockController.exportStockHistory
);

router.get(
  '/history/product/:productId',
  authorizePermission('stock', 'view'),
  validate([...productIdParamValidation, ...listStockHistoryValidation.slice(0, 2)]),
  stockController.getProductStockHistory
);

router.get(
  '/history',
  authorizePermission('stock', 'view'),
  validate(listStockHistoryValidation),
  stockController.listStockHistory
);

router.get(
  '/low-stock/export',
  authorizePermission('stock', 'view'),
  validate([query('format').optional().isIn(['excel', 'pdf'])]),
  stockController.exportLowStock
);

router.get(
  '/low-stock',
  authorizePermission('stock', 'view'),
  validate(listStockHistoryValidation.slice(0, 2)),
  stockController.listLowStock
);

export default router;
