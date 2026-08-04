import { Router } from 'express';
import * as paymentController from '../controllers/payment.controller.js';
import { authenticate, authorizePermission } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  pendingListValidation,
  paymentHistoryValidation,
  receivePaymentValidation,
  paymentIdValidation,
  saleIdValidation,
  exportValidation,
} from '../validators/payment.validator.js';

const router = Router();

router.use(authenticate);

router.get(
  '/pending/export',
  authorizePermission('payments', 'view'),
  validate(exportValidation),
  paymentController.exportPendingPayments
);

router.get(
  '/pending/:saleId/whatsapp',
  authorizePermission('payments', 'view'),
  validate(saleIdValidation),
  paymentController.getWhatsAppReminder
);

router.get(
  '/pending',
  authorizePermission('payments', 'view'),
  validate(pendingListValidation),
  paymentController.getPendingPayments
);

router.get(
  '/history',
  authorizePermission('payments', 'view'),
  validate(paymentHistoryValidation),
  paymentController.getPaymentHistory
);

router.get(
  '/:paymentId/receipt',
  authorizePermission('payments', 'view'),
  validate(paymentIdValidation),
  paymentController.downloadReceipt
);

router.get(
  '/:paymentId',
  authorizePermission('payments', 'view'),
  validate(paymentIdValidation),
  paymentController.getPaymentById
);

router.post(
  '/receive',
  authorizePermission('payments', 'create'),
  validate(receivePaymentValidation),
  paymentController.receivePayment
);

export default router;
