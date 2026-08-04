import { logger } from '../utils/logger.js';
import { AppError } from '../utils/apiResponse.js';

export const notFoundHandler = (req, res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};

export const errorHandler = (err, req, res, _next) => {
  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Internal server error';

  if (!err.isOperational) {
    logger.error(`${req.method} ${req.originalUrl} - ${err.message}`, { stack: err.stack });
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors: err.errors || null,
    ...(process.env.NODE_ENV === 'development' && !err.isOperational && { stack: err.stack }),
  });
};
