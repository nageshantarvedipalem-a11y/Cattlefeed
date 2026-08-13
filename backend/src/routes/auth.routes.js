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
  updateProfileValidation,
} from '../validators/auth.validator.js';
import { avatarUpload } from '../middlewares/upload.middleware.js';

const router = Router();

router.post('/login', authRateLimiter, validate(loginValidation), authController.login);
router.post('/forgot-password', authRateLimiter, validate(forgotPasswordValidation), authController.forgotPassword);
router.post('/reset-password', authRateLimiter, validate(resetPasswordValidation), authController.resetPassword);

router.get('/me', authenticate, authController.me);
router.post('/logout', authenticate, authController.logout);
router.patch('/me', authenticate, validate(updateProfileValidation), authController.updateProfile);
router.post(
  '/me/avatar',
  authenticate,
  avatarUpload.single('avatar'),
  authController.uploadAvatar
);
router.post('/change-password', authenticate, validate(changePasswordValidation), authController.changePassword);

export default router;
