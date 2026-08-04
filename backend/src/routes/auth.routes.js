import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { authRateLimiter } from '../middlewares/rateLimiter.js';
import {
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  changePasswordValidation,
} from '../validators/auth.validator.js';

const router = Router();

router.post('/login', authRateLimiter, validate(loginValidation), authController.login);
router.post('/forgot-password', authRateLimiter, validate(forgotPasswordValidation), authController.forgotPassword);
router.post('/reset-password', authRateLimiter, validate(resetPasswordValidation), authController.resetPassword);

router.get('/me', authenticate, authController.me);
router.post('/logout', authenticate, authController.logout);
router.post('/change-password', authenticate, validate(changePasswordValidation), authController.changePassword);

export default router;
