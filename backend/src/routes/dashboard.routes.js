import { Router } from 'express';
import * as dashboardController from '../controllers/dashboard.controller.js';
import { authenticate, authorizePermission } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  authorizePermission('dashboard', 'view'),
  dashboardController.getDashboard
);

export default router;
