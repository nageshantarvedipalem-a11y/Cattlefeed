import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller.js';
import { authenticate, authorizePermission } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { chartKeyValidation } from '../validators/dashboard.validator.js';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  authorizePermission('dashboard', 'view'),
  dashboardController.getDashboard
);

router.get(
  '/charts/:chartKey',
  authorizePermission('dashboard', 'view'),
  validate(chartKeyValidation),
  dashboardController.getChartData
);

export default router;
