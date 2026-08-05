import { verifyAccessToken } from '../helpers/jwt.helper.js';
import { findUserById, sanitizeUser } from '../repositories/user.repository.js';
import { AppError } from '../utils/apiResponse.js';
import { getCachedUser, setCachedUser } from '../utils/authCache.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Authentication required', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);

    let user = getCachedUser(decoded.userId);
    if (!user) {
      user = await findUserById(decoded.userId);
      if (!user) {
        throw new AppError('User account not found or inactive', 401);
      }
      setCachedUser(decoded.userId, user);
    }

    req.user = sanitizeUser(user);
    req.token = token;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new AppError('Session expired. Please login again.', 401));
    }
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Invalid authentication token', 401));
    }
    next(error);
  }
};

export const authorize = (...roleNames) => (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }

  if (roleNames.length > 0 && !roleNames.includes(req.user.roleName)) {
    return next(new AppError('You do not have permission to access this resource', 403));
  }

  next();
};

export const authorizePermission = (module, action) => (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }

  if (req.user.roleName === 'owner') {
    return next();
  }

  const permissions = req.user.permissions || {};
  const modulePerms = permissions[module];

  if (modulePerms === true) {
    return next();
  }

  if (typeof modulePerms === 'object' && modulePerms?.[action]) {
    return next();
  }

  return next(new AppError('You do not have permission to perform this action', 403));
};
