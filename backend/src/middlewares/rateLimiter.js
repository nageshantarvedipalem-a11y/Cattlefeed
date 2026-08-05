import rateLimit from 'express-rate-limit';

const isDev = process.env.NODE_ENV !== 'production';
const rateLimitDisabled = process.env.DISABLE_RATE_LIMIT === 'true';

const noopLimiter = (_req, _res, next) => next();

export const apiRateLimiter = rateLimitDisabled
  ? noopLimiter
  : rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || (isDev ? 10000 : 10000),
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => req.path.includes('/health'),
      message: {
        success: false,
        message: 'Too many requests, please try again later.',
      },
    });

export const authRateLimiter = noopLimiter;
