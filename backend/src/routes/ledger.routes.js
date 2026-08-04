import { Router } from 'express';
import * as ledgerController from '../controllers/ledger.controller.js';
import { authenticate, authorizePermission } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  listSummariesValidation,
  ledgerFiltersValidation,
  customerIdValidation,
  createAdjustmentValidation,
  exportValidation,
} from '../validators/ledger.validator.js';

const router = Router();

router.use(authenticate);

router.get(
  '/customers',
  authorizePermission('ledger', 'view'),
  validate(listSummariesValidation),
  ledgerController.listCustomerSummaries
);

router.get(
  '/customers/:customerId/export',
  authorizePermission('ledger', 'view'),
  validate(exportValidation),
  ledgerController.exportCustomerLedger
);

router.get(
  '/customers/:customerId',
  authorizePermission('ledger', 'view'),
  validate([...customerIdValidation, ...ledgerFiltersValidation]),
  ledgerController.getCustomerLedger
);

router.get(
  '/entries',
  authorizePermission('ledger', 'view'),
  validate(ledgerFiltersValidation),
  ledgerController.listEntries
);

router.post(
  '/adjustments',
  authorizePermission('ledger', 'edit'),
  validate(createAdjustmentValidation),
  ledgerController.createAdjustment
);

export default router;
