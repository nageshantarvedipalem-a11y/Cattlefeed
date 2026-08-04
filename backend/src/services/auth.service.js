import {
  findUserByIdentifier,
  findUserById,
  findUserByEmail,
  updateLastLogin,
  updatePassword,
  createPasswordResetToken,
  findValidResetToken,
  markResetTokenUsed,
  generateResetToken,
  sanitizeUser,
  findUserWithPasswordById,
} from '../repositories/user.repository.js';
import { logActivity } from '../repositories/activityLog.repository.js';
import { comparePassword, hashPassword, validatePasswordStrength } from '../helpers/password.helper.js';
import { signAccessToken } from '../helpers/jwt.helper.js';
import { AppError } from '../utils/apiResponse.js';

export class AuthService {
  async login(identifier, password, ipAddress) {
    const user = await findUserByIdentifier(identifier);

    if (!user) {
      throw new AppError('Invalid username or password', 401);
    }

    const isValid = await comparePassword(password, user.password_hash);
    if (!isValid) {
      await logActivity({
        userId: user.id,
        action: 'login_failed',
        entityType: 'user',
        entityId: user.id,
        details: { identifier },
        ipAddress,
      });
      throw new AppError('Invalid username or password', 401);
    }

    await updateLastLogin(user.id);

    const sanitized = sanitizeUser(user);
    const token = signAccessToken({
      userId: sanitized.id,
      roleId: sanitized.roleId,
      roleName: sanitized.roleName,
      username: sanitized.username,
    });

    await logActivity({
      userId: user.id,
      action: 'login_success',
      entityType: 'user',
      entityId: user.id,
      ipAddress,
    });

    return { user: sanitized, token };
  }

  async getProfile(userId) {
    const user = await findUserById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return sanitizeUser(user);
  }

  async logout(userId, ipAddress) {
    await logActivity({
      userId,
      action: 'logout',
      entityType: 'user',
      entityId: userId,
      ipAddress,
    });
    return true;
  }

  async forgotPassword(email, ipAddress) {
    const user = await findUserByEmail(email);

    if (!user) {
      return {
        message: 'If an account exists with this email, a reset link has been generated.',
      };
    }

    const token = generateResetToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await createPasswordResetToken(user.id, token, expiresAt);

    await logActivity({
      userId: user.id,
      action: 'password_reset_requested',
      entityType: 'user',
      entityId: user.id,
      ipAddress,
    });

    const resetPath = `/reset-password?token=${token}`;

    return {
      message: 'If an account exists with this email, a reset link has been generated.',
      resetToken: process.env.NODE_ENV === 'development' ? token : undefined,
      resetPath: process.env.NODE_ENV === 'development' ? resetPath : undefined,
    };
  }

  async resetPassword(token, newPassword, ipAddress) {
    const strengthError = validatePasswordStrength(newPassword);
    if (strengthError) {
      throw new AppError(strengthError, 400);
    }

    const resetRecord = await findValidResetToken(token);
    if (!resetRecord) {
      throw new AppError('Invalid or expired reset token', 400);
    }

    if (!resetRecord.is_active) {
      throw new AppError('Account is inactive', 403);
    }

    const passwordHash = await hashPassword(newPassword);
    await updatePassword(resetRecord.user_id, passwordHash);
    await markResetTokenUsed(resetRecord.id);

    await logActivity({
      userId: resetRecord.user_id,
      action: 'password_reset_completed',
      entityType: 'user',
      entityId: resetRecord.user_id,
      ipAddress,
    });

    return { message: 'Password reset successfully. Please login with your new password.' };
  }

  async changePassword(userId, currentPassword, newPassword, ipAddress) {
    const user = await findUserWithPasswordById(userId);

    if (!user || !user.is_active) {
      throw new AppError('User not found', 404);
    }

    const isValid = await comparePassword(currentPassword, user.password_hash);
    if (!isValid) {
      throw new AppError('Current password is incorrect', 400);
    }

    const strengthError = validatePasswordStrength(newPassword);
    if (strengthError) {
      throw new AppError(strengthError, 400);
    }

    if (currentPassword === newPassword) {
      throw new AppError('New password must be different from current password', 400);
    }

    const passwordHash = await hashPassword(newPassword);
    await updatePassword(userId, passwordHash);

    await logActivity({
      userId,
      action: 'password_changed',
      entityType: 'user',
      entityId: userId,
      ipAddress,
    });

    return { message: 'Password changed successfully' };
  }
}

export default new AuthService();
