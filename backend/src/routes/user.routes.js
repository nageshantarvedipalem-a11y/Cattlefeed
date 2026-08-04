import { Router } from 'express';
import * as userController from '../controllers/user.controller.js';
import { authenticate, authorizePermission } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
  listUsersValidation,
  userIdValidation,
  createUserValidation,
  updateUserValidation,
  updateStatusValidation,
} from '../validators/user.validator.js';

const router = Router();

router.use(authenticate);

router.get(
  '/roles',
  authorizePermission('users', 'view'),
  userController.listRoles
);

router.get(
  '/',
  authorizePermission('users', 'view'),
  validate(listUsersValidation),
  userController.listUsers
);

router.get(
  '/:id',
  authorizePermission('users', 'view'),
  validate(userIdValidation),
  userController.getUser
);

router.post(
  '/',
  authorizePermission('users', 'create'),
  validate(createUserValidation),
  userController.createUser
);

router.put(
  '/:id',
  authorizePermission('users', 'edit'),
  validate(updateUserValidation),
  userController.updateUser
);

router.patch(
  '/:id/status',
  authorizePermission('users', 'edit'),
  validate(updateStatusValidation),
  userController.updateUserStatus
);

router.delete(
  '/:id',
  authorizePermission('users', 'delete'),
  validate(userIdValidation),
  userController.deleteUser
);

export default router;
