import jwt from 'jsonwebtoken';
import { AppError } from '../utils/apiResponse.js';

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

export const signAccessToken = (payload) => {
  if (!JWT_SECRET) {
    throw new AppError('JWT secret is not configured', 500);
  }

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const verifyAccessToken = (token) => {
  if (!JWT_SECRET) {
    throw new AppError('JWT secret is not configured', 500);
  }

  return jwt.verify(token, JWT_SECRET);
};

export const decodeToken = (token) => jwt.decode(token);
