import { Router } from 'express';
import * as supplierController from '../controllers/supplier.controller.js';
import { authenticate, authorizePermission } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  listSuppliersValidation,
  supplierIdValidation,
  createSupplierValidation,
  updateSupplierValidation,
  updateStatusValidation,
} from '../validators/supplier.validator.js';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  authorizePermission('suppliers', 'view'),
  validate(listSuppliersValidation),
  supplierController.listSuppliers
);

router.get(
  '/:id/purchases',
  authorizePermission('suppliers', 'view'),
  validate(supplierIdValidation),
  supplierController.getSupplierPurchases
);

router.get(
  '/:id',
  authorizePermission('suppliers', 'view'),
  validate(supplierIdValidation),
  supplierController.getSupplier
);

router.post(
  '/',
  authorizePermission('suppliers', 'create'),
  validate(createSupplierValidation),
  supplierController.createSupplier
);

router.put(
  '/:id',
  authorizePermission('suppliers', 'edit'),
  validate(updateSupplierValidation),
  supplierController.updateSupplier
);

router.patch(
  '/:id/status',
  authorizePermission('suppliers', 'edit'),
  validate(updateStatusValidation),
  supplierController.updateSupplierStatus
);

router.delete(
  '/:id',
  authorizePermission('suppliers', 'delete'),
  validate(supplierIdValidation),
  supplierController.deleteSupplier
);

export default router;
