import { Router } from 'express';
import * as whatsappController from '../controllers/whatsapp.controller.js';
import { authenticate, authorizePermission } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  updateWhatsAppConfigValidation,
  listWhatsAppMessagesValidation,
  saleIdValidation,
} from '../validators/whatsapp.validator.js';

const router = Router();

router.use(authenticate);

router.get(
  '/settings',
  authorizePermission('settings', 'view'),
  whatsappController.getWhatsAppConfig
);

router.put(
  '/settings',
  authorizePermission('settings', 'edit'),
  validate(updateWhatsAppConfigValidation),
  whatsappController.updateWhatsAppConfig
);

router.post(
  '/test',
  authorizePermission('settings', 'edit'),
  whatsappController.testWhatsAppConnection
);

router.get(
  '/messages',
  authorizePermission('settings', 'view'),
  validate(listWhatsAppMessagesValidation),
  whatsappController.listWhatsAppMessages
);

router.post(
  '/invoice/:saleId',
  authorizePermission('billing', 'create'),
  validate(saleIdValidation),
  whatsappController.sendInvoiceViaWhatsApp
);

router.post(
  '/reminder/:saleId',
  authorizePermission('payments', 'create'),
  validate(saleIdValidation),
  whatsappController.sendReminderViaWhatsApp
);

router.get(
  '/reminder/:saleId/link',
  authorizePermission('payments', 'view'),
  validate(saleIdValidation),
  whatsappController.getReminderLink
);

export default router;
