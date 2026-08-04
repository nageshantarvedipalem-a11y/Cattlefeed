import { Router } from 'express';
import * as reportController from '../controllers/report.controller.js';
import { authenticate, authorizePermission } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { reportTypeValidation, reportFiltersValidation, exportValidation } from '../validators/report.validator.js';

const router = Router();

router.use(authenticate);

router.get(
  '/:type/export',
  authorizePermission('reports', 'export'),
  validate(exportValidation),
  reportController.exportReport
);

router.get(
  '/:type',
  authorizePermission('reports', 'view'),
  validate([...reportTypeValidation, ...reportFiltersValidation]),
  reportController.getReport
);

export default router;
