import { Router } from 'express';
import * as cashBookController from '../controllers/cashBook.controller.js';
import { authenticate, authorizePermission } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  listCashBookValidation,
  createEntryValidation,
  exportValidation,
} from '../validators/cashBook.validator.js';

const router = Router();

router.use(authenticate);

router.get(
  '/export',
  authorizePermission('cashbook', 'view'),
  validate(exportValidation),
  cashBookController.exportCashBook
);

router.get(
  '/',
  authorizePermission('cashbook', 'view'),
  validate(listCashBookValidation),
  cashBookController.getCashBook
);

router.post(
  '/entries',
  authorizePermission('cashbook', 'create'),
  validate(createEntryValidation),
  cashBookController.createEntry
);

export default router;
