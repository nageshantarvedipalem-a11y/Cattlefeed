import { Router } from 'express';
import * as customerController from '../controllers/customer.controller.js';
import { authenticate, authorizePermission } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  listCustomersValidation,
  customerIdValidation,
  createCustomerValidation,
  updateCustomerValidation,
  updateStatusValidation,
} from '../validators/customer.validator.js';

const router = Router();

router.use(authenticate);

router.get(
  '/villages',
  authorizePermission('customers', 'view'),
  customerController.getVillages
);

router.get(
  '/',
  authorizePermission('customers', 'view'),
  validate(listCustomersValidation),
  customerController.listCustomers
);

router.get(
  '/:id/sales',
  authorizePermission('customers', 'view'),
  validate(customerIdValidation),
  customerController.getCustomerSales
);

router.get(
  '/:id/ledger',
  authorizePermission('customers', 'view'),
  validate(customerIdValidation),
  customerController.getCustomerLedger
);

router.get(
  '/:id',
  authorizePermission('customers', 'view'),
  validate(customerIdValidation),
  customerController.getCustomer
);

router.post(
  '/',
  authorizePermission('customers', 'create'),
  validate(createCustomerValidation),
  customerController.createCustomer
);

router.put(
  '/:id',
  authorizePermission('customers', 'edit'),
  validate(updateCustomerValidation),
  customerController.updateCustomer
);

router.patch(
  '/:id/status',
  authorizePermission('customers', 'edit'),
  validate(updateStatusValidation),
  customerController.updateCustomerStatus
);

router.delete(
  '/:id',
  authorizePermission('customers', 'delete'),
  validate(customerIdValidation),
  customerController.deleteCustomer
);

export default router;
