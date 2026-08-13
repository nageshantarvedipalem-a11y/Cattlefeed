import { logger } from '../utils/logger.js';
import { AppError } from '../utils/apiResponse.js';

export const notFoundHandler = (req, res, next) => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};

const isDbConnectionLimitError = (err) =>
  err?.message?.includes('max_connections_per_hour')
  || err?.message?.includes('max_user_connections')
  || err?.code === 'ER_USER_LIMIT_REACHED';

export const errorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.isOperational ? err.message : 'Internal server error';

  if (!err.isOperational && isDbConnectionLimitError(err)) {
    statusCode = 503;
    message = 'Database connection limit reached. Please wait a few minutes and try again.';
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 400;
    message = 'Image must be smaller than 2 MB';
  } else if (err.message?.includes('Only JPEG, PNG, WebP, or GIF')) {
    statusCode = 400;
    message = err.message;
  }

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
