import userService from '../services/user.service.js';
import { findAllRoles } from '../repositories/role.repository.js';
import { asyncHandler, sendSuccess, sendPaginated } from '../utils/apiResponse.js';
import { getClientIp } from '../middlewares/validate.middleware.js';

export const listUsers = asyncHandler(async (req, res) => {
  const result = await userService.listUsers(req.query);
  sendPaginated(res, result.users, result.pagination, 'Users fetched successfully');
});

export const getUser = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.params.id);
  sendSuccess(res, { user }, 'User fetched successfully');
});

export const createUser = asyncHandler(async (req, res) => {
  const user = await userService.createUser(req.user, req.body, getClientIp(req));
  sendSuccess(res, { user }, 'User created successfully', 201);
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await userService.updateUser(req.user, req.params.id, req.body, getClientIp(req));
  sendSuccess(res, { user }, 'User updated successfully');
});

export const updateUserStatus = asyncHandler(async (req, res) => {
  const user = await userService.updateUserStatus(
    req.user,
    req.params.id,
    req.body.isActive,
    getClientIp(req)
  );
  sendSuccess(res, { user }, `User ${req.body.isActive ? 'enabled' : 'disabled'} successfully`);
});

export const deleteUser = asyncHandler(async (req, res) => {
  const result = await userService.deleteUser(req.user, req.params.id, getClientIp(req));
  sendSuccess(res, result, result.message);
});

export const listRoles = asyncHandler(async (_req, res) => {
  const roles = await findAllRoles();
  sendSuccess(res, {
    roles: roles.map((role) => ({
      id: role.id,
      name: role.name,
      label: role.name.charAt(0).toUpperCase() + role.name.slice(1),
    })),
  }, 'Roles fetched successfully');
});
