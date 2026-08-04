import { Router } from 'express';
import * as profitController from '../controllers/profit.controller.js';
import { authenticate, authorizePermission } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { profitFiltersValidation, exportValidation } from '../validators/profit.validator.js';

const router = Router();

router.use(authenticate);

router.get(
  '/export',
  authorizePermission('reports', 'export'),
  validate(exportValidation),
  profitController.exportProfit
);

router.get(
  '/',
  authorizePermission('reports', 'view'),
  validate(profitFiltersValidation),
  profitController.getProfitDashboard
);

export default router;
