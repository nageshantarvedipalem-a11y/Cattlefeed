import { Router } from 'express';
import * as cashBookController from '../controllers/cashBook.controller.js';
import { authenticate, authorizePermission } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  listCashBookValidation,
  createEntryValidation,
  updateEntryValidation,
  entryIdValidation,
  openingBalanceValidation,
  dailyReportValidation,
  monthlySummaryValidation,
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
  '/balance',
  authorizePermission('cashbook', 'view'),
  cashBookController.getBalance
);

router.get(
  '/daily-report',
  authorizePermission('cashbook', 'view'),
  validate(dailyReportValidation),
  cashBookController.getDailyReport
);

router.get(
  '/monthly-summary',
  authorizePermission('cashbook', 'view'),
  validate(monthlySummaryValidation),
  cashBookController.getMonthlySummary
);

router.get(
  '/',
  authorizePermission('cashbook', 'view'),
  validate(listCashBookValidation),
  cashBookController.getCashBook
);

router.post(
  '/opening-balance',
  authorizePermission('cashbook', 'create'),
  validate(openingBalanceValidation),
  cashBookController.setOpeningBalance
);

router.post(
  '/entries',
  authorizePermission('cashbook', 'create'),
  validate(createEntryValidation),
  cashBookController.createEntry
);

router.put(
  '/entries/:entryId',
  authorizePermission('cashbook', 'edit'),
  validate(updateEntryValidation),
  cashBookController.updateEntry
);

router.delete(
  '/entries/:entryId',
  authorizePermission('cashbook', 'delete'),
  validate(entryIdValidation),
  cashBookController.deleteEntry
);

export default router;
