import authService from '../services/auth.service.js';
import { asyncHandler, sendSuccess } from '../utils/apiResponse.js';
import { getClientIp } from '../middlewares/validate.middleware.js';

export const login = asyncHandler(async (req, res) => {
  const { identifier, password } = req.body;
  const result = await authService.login(identifier, password, getClientIp(req));
  sendSuccess(res, result, 'Login successful');
});

export const me = asyncHandler(async (req, res) => {
  const user = await authService.getProfile(req.user.id);
  sendSuccess(res, { user }, 'Profile fetched successfully');
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.user.id, getClientIp(req));
  sendSuccess(res, null, 'Logout successful');
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.forgotPassword(req.body.email, getClientIp(req));
  sendSuccess(res, result, result.message);
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  const result = await authService.resetPassword(token, password, getClientIp(req));
  sendSuccess(res, result, result.message);
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const result = await authService.changePassword(
    req.user.id,
    currentPassword,
    newPassword,
    getClientIp(req)
  );
  sendSuccess(res, result, result.message);
});
