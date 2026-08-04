import {
  findUsers,
  findUserByIdForAdmin,
  findDuplicateUser,
  createUserRecord,
  updateUserRecord,
  deleteUserRecord,
  countActiveOwners,
} from '../repositories/userManagement.repository.js';
import { findRoleById } from '../repositories/role.repository.js';
import { sanitizeUser } from '../repositories/user.repository.js';
import { logActivity } from '../repositories/activityLog.repository.js';
import { hashPassword, validatePasswordStrength } from '../helpers/password.helper.js';
import { AppError } from '../utils/apiResponse.js';

const formatUserResponse = (user) => {
  const sanitized = sanitizeUser(user);
  return {
    ...sanitized,
    createdAt: user.created_at,
    updatedAt: user.updated_at,
  };
};

const assertCanAssignRole = (currentUser, role) => {
  if (currentUser.roleName === 'owner') return;

  if (role.name === 'owner') {
    throw new AppError('Only owners can assign the owner role', 403);
  }
};

const assertNotSelf = (currentUserId, targetUserId, action) => {
  if (currentUserId === targetUserId) {
    throw new AppError(`You cannot ${action} your own account`, 400);
  }
};

export class UserService {
  async listUsers(queryParams) {
    const page = Math.max(parseInt(queryParams.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(queryParams.limit, 10) || 10, 1), 100);

    const { users, total } = await findUsers({
      search: queryParams.search?.trim() || '',
      roleId: queryParams.roleId || null,
      isActive: queryParams.isActive,
      page,
      limit,
      sortBy: queryParams.sortBy || 'createdAt',
      sortOrder: queryParams.sortOrder || 'desc',
    });

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getUserById(userId) {
    const user = await findUserByIdForAdmin(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    return formatUserResponse(user);
  }

  async createUser(currentUser, data, ipAddress) {
    const role = await findRoleById(data.roleId);
    if (!role || !role.is_active) {
      throw new AppError('Invalid role selected', 400);
    }

    assertCanAssignRole(currentUser, role);

    const duplicate = await findDuplicateUser({
      username: data.username,
      email: data.email,
    });

    if (duplicate) {
      const field = duplicate.username === data.username ? 'username' : 'email';
      throw new AppError(`A user with this ${field} already exists`, 409);
    }

    const strengthError = validatePasswordStrength(data.password);
    if (strengthError) {
      throw new AppError(strengthError, 400);
    }

    const passwordHash = await hashPassword(data.password);
    const userId = await createUserRecord({
      roleId: data.roleId,
      username: data.username.trim(),
      email: data.email.trim().toLowerCase(),
      passwordHash,
      fullName: data.fullName.trim(),
      phone: data.phone?.trim() || null,
      isActive: data.isActive !== false,
    });

    await logActivity({
      userId: currentUser.id,
      action: 'user_created',
      entityType: 'user',
      entityId: userId,
      details: { username: data.username, role: role.name },
      ipAddress,
    });

    return this.getUserById(userId);
  }

  async updateUser(currentUser, userId, data, ipAddress) {
    const existing = await findUserByIdForAdmin(userId);
    if (!existing) {
      throw new AppError('User not found', 404);
    }

    if (data.roleId && data.roleId !== existing.role_id) {
      const role = await findRoleById(data.roleId);
      if (!role || !role.is_active) {
        throw new AppError('Invalid role selected', 400);
      }
      assertCanAssignRole(currentUser, role);

      if (existing.role_name === 'owner' && role.name !== 'owner') {
        const owners = await countActiveOwners(userId);
        if (owners === 0) {
          throw new AppError('At least one active owner is required', 400);
        }
      }
    }

    const duplicate = await findDuplicateUser({
      username: data.username || existing.username,
      email: data.email || existing.email,
      excludeId: userId,
    });

    if (duplicate) {
      const field = duplicate.username === (data.username || existing.username) ? 'username' : 'email';
      throw new AppError(`A user with this ${field} already exists`, 409);
    }

    const updateData = {};

    if (data.roleId !== undefined) updateData.roleId = data.roleId;
    if (data.username !== undefined) updateData.username = data.username.trim();
    if (data.email !== undefined) updateData.email = data.email.trim().toLowerCase();
    if (data.fullName !== undefined) updateData.fullName = data.fullName.trim();
    if (data.phone !== undefined) updateData.phone = data.phone?.trim() || null;

    if (data.password) {
      const strengthError = validatePasswordStrength(data.password);
      if (strengthError) {
        throw new AppError(strengthError, 400);
      }
      updateData.passwordHash = await hashPassword(data.password);
    }

    await updateUserRecord(userId, updateData);

    await logActivity({
      userId: currentUser.id,
      action: 'user_updated',
      entityType: 'user',
      entityId: userId,
      details: { username: data.username || existing.username },
      ipAddress,
    });

    return this.getUserById(userId);
  }

  async updateUserStatus(currentUser, userId, isActive, ipAddress) {
    const existing = await findUserByIdForAdmin(userId);
    if (!existing) {
      throw new AppError('User not found', 404);
    }

    if (!isActive) {
      assertNotSelf(currentUser.id, userId, 'disable');

      if (existing.role_name === 'owner') {
        const owners = await countActiveOwners(userId);
        if (owners === 0) {
          throw new AppError('Cannot disable the last active owner', 400);
        }
      }
    }

    await updateUserRecord(userId, { isActive });

    await logActivity({
      userId: currentUser.id,
      action: isActive ? 'user_enabled' : 'user_disabled',
      entityType: 'user',
      entityId: userId,
      details: { username: existing.username },
      ipAddress,
    });

    return this.getUserById(userId);
  }

  async deleteUser(currentUser, userId, ipAddress) {
    const existing = await findUserByIdForAdmin(userId);
    if (!existing) {
      throw new AppError('User not found', 404);
    }

    assertNotSelf(currentUser.id, userId, 'delete');

    if (existing.role_name === 'owner') {
      const owners = await countActiveOwners(userId);
      if (owners === 0) {
        throw new AppError('Cannot delete the last active owner', 400);
      }
    }

    try {
      await deleteUserRecord(userId);
    } catch (error) {
      if (error.code === 'ER_ROW_IS_REFERENCED_2') {
        throw new AppError(
          'Cannot delete user with existing records. Disable the user instead.',
          400
        );
      }
      throw error;
    }

    await logActivity({
      userId: currentUser.id,
      action: 'user_deleted',
      entityType: 'user',
      entityId: userId,
      details: { username: existing.username },
      ipAddress,
    });

    return { message: 'User deleted successfully' };
  }
}

export default new UserService();
