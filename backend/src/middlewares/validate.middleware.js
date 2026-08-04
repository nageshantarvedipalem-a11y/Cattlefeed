import { validationResult } from 'express-validator';
import { AppError } from '../utils/apiResponse.js';

export const validate = (validations) => async (req, res, next) => {
  await Promise.all(validations.map((validation) => validation.run(req)));

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError('Validation failed', 422, errors.array()));
  }

  return next();
};

export const getClientIp = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req.socket.remoteAddress
    || null;
};
