import { body, param, query } from 'express-validator';

export const listUsersValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('sortBy').optional().isIn(['id', 'username', 'email', 'fullName', 'roleName', 'isActive', 'createdAt', 'lastLoginAt']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
  query('roleId').optional().isInt({ min: 1 }),
  query('isActive').optional().isIn(['true', 'false', '1', '0']),
];

export const userIdValidation = [
  param('id').isInt({ min: 1 }).withMessage('Valid user ID is required'),
];

export const createUserValidation = [
  body('roleId').isInt({ min: 1 }).withMessage('Role is required'),
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be 3-50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ max: 100 })
    .withMessage('Full name is too long'),
  body('phone')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 20 })
    .withMessage('Phone number is too long'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
];

export const updateUserValidation = [
  ...userIdValidation,
  body('roleId').optional().isInt({ min: 1 }).withMessage('Invalid role'),
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be 3-50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Full name is required'),
  body('phone')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 20 })
    .withMessage('Phone number is too long'),
  body('password')
    .optional()
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
];

export const updateStatusValidation = [
  ...userIdValidation,
  body('isActive').isBoolean().withMessage('isActive must be true or false'),
];
