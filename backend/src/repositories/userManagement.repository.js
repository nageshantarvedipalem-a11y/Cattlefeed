import { query } from '../../config/database.js';
import { sanitizeUser } from './user.repository.js';

const SORTABLE_COLUMNS = {
  id: 'u.id',
  username: 'u.username',
  email: 'u.email',
  fullName: 'u.full_name',
  roleName: 'r.name',
  isActive: 'u.is_active',
  createdAt: 'u.created_at',
  lastLoginAt: 'u.last_login_at',
};

export const findUsers = async ({
  search = '',
  roleId = null,
  isActive = null,
  page = 1,
  limit = 10,
  sortBy = 'createdAt',
  sortOrder = 'desc',
}) => {
  const offset = (page - 1) * limit;
  const sortColumn = SORTABLE_COLUMNS[sortBy] || SORTABLE_COLUMNS.createdAt;
  const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  let whereClause = 'WHERE 1=1';
  const params = [];

  if (search) {
    whereClause += ' AND (u.username LIKE ? OR u.email LIKE ? OR u.full_name LIKE ? OR u.phone LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }

  if (roleId) {
    whereClause += ' AND u.role_id = ?';
    params.push(roleId);
  }

  if (isActive !== null && isActive !== undefined && isActive !== '') {
    whereClause += ' AND u.is_active = ?';
    params.push(isActive === 'true' || isActive === true || isActive === '1' || isActive === 1 ? 1 : 0);
  }

  const countRows = await query(
    `SELECT COUNT(*) AS total
     FROM users u
     INNER JOIN roles r ON r.id = u.role_id
     ${whereClause}`,
    params
  );

  const rows = await query(
    `SELECT u.id, u.role_id, u.username, u.email, u.full_name, u.phone,
            u.is_active, u.last_login_at, u.created_at, u.updated_at,
            r.name AS role_name
     FROM users u
     INNER JOIN roles r ON r.id = u.role_id
     ${whereClause}
     ORDER BY ${sortColumn} ${order}
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    users: rows.map((row) => ({
      ...sanitizeUser({ ...row, permissions: {} }),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
    total: countRows[0]?.total || 0,
  };
};

export const findUserByIdForAdmin = async (userId) => {
  const rows = await query(
    `SELECT u.id, u.role_id, u.username, u.email, u.full_name, u.phone,
            u.is_active, u.last_login_at, u.created_at, u.updated_at,
            r.name AS role_name, r.permissions
     FROM users u
     INNER JOIN roles r ON r.id = u.role_id
     WHERE u.id = ?
     LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
};

export const findDuplicateUser = async ({ username, email, excludeId = null }) => {
  let sql = `
    SELECT id, username, email
    FROM users
    WHERE (username = ? OR email = ?)
  `;
  const params = [username, email];

  if (excludeId) {
    sql += ' AND id != ?';
    params.push(excludeId);
  }

  sql += ' LIMIT 1';
  const rows = await query(sql, params);
  return rows[0] || null;
};

export const createUserRecord = async ({
  roleId,
  username,
  email,
  passwordHash,
  fullName,
  phone,
  isActive = 1,
}) => {
  const result = await query(
    `INSERT INTO users (role_id, username, email, password_hash, full_name, phone, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [roleId, username, email, passwordHash, fullName, phone || null, isActive ? 1 : 0]
  );
  return result.insertId;
};

export const updateUserRecord = async (userId, data) => {
  const fields = [];
  const values = [];

  if (data.roleId !== undefined) {
    fields.push('role_id = ?');
    values.push(data.roleId);
  }
  if (data.username !== undefined) {
    fields.push('username = ?');
    values.push(data.username);
  }
  if (data.email !== undefined) {
    fields.push('email = ?');
    values.push(data.email);
  }
  if (data.fullName !== undefined) {
    fields.push('full_name = ?');
    values.push(data.fullName);
  }
  if (data.phone !== undefined) {
    fields.push('phone = ?');
    values.push(data.phone || null);
  }
  if (data.passwordHash !== undefined) {
    fields.push('password_hash = ?');
    values.push(data.passwordHash);
  }
  if (data.isActive !== undefined) {
    fields.push('is_active = ?');
    values.push(data.isActive ? 1 : 0);
  }

  if (fields.length === 0) return;

  fields.push('updated_at = NOW()');
  values.push(userId);

  await query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
};

export const deleteUserRecord = async (userId) => {
  await query('DELETE FROM users WHERE id = ?', [userId]);
};

export const countActiveOwners = async (excludeUserId = null) => {
  let sql = `
    SELECT COUNT(*) AS total
    FROM users u
    INNER JOIN roles r ON r.id = u.role_id
    WHERE r.name = 'owner' AND u.is_active = 1
  `;
  const params = [];

  if (excludeUserId) {
    sql += ' AND u.id != ?';
    params.push(excludeUserId);
  }

  const rows = await query(sql, params);
  return rows[0]?.total || 0;
};
