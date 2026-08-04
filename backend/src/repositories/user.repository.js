import crypto from 'crypto';
import { query } from '../../config/database.js';

export const findUserByIdentifier = async (identifier) => {
  const rows = await query(
    `SELECT u.id, u.role_id, u.username, u.email, u.password_hash, u.full_name,
            u.phone, u.is_active, u.last_login_at, r.name AS role_name, r.permissions
     FROM users u
     INNER JOIN roles r ON r.id = u.role_id
     WHERE (u.username = ? OR u.email = ?) AND u.is_active = 1
     LIMIT 1`,
    [identifier, identifier]
  );
  return rows[0] || null;
};

export const findUserById = async (userId) => {
  const rows = await query(
    `SELECT u.id, u.role_id, u.username, u.email, u.full_name, u.phone,
            u.is_active, u.last_login_at, u.created_at, r.name AS role_name, r.permissions
     FROM users u
     INNER JOIN roles r ON r.id = u.role_id
     WHERE u.id = ? AND u.is_active = 1
     LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
};

export const findUserByEmail = async (email) => {
  const rows = await query(
    `SELECT u.id, u.email, u.full_name, u.is_active
     FROM users u
     WHERE u.email = ? AND u.is_active = 1
     LIMIT 1`,
    [email]
  );
  return rows[0] || null;
};

export const findUserWithPasswordById = async (userId) => {
  const rows = await query(
    `SELECT u.id, u.username, u.email, u.password_hash, u.is_active
     FROM users u
     WHERE u.id = ?
     LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
};

export const updateLastLogin = async (userId) => {
  await query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [userId]);
};

export const updatePassword = async (userId, passwordHash) => {
  await query(
    'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
    [passwordHash, userId]
  );
};

export const createPasswordResetToken = async (userId, token, expiresAt) => {
  await query(
    'UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL',
    [userId]
  );

  await query(
    `INSERT INTO password_reset_tokens (user_id, token, expires_at)
     VALUES (?, ?, ?)`,
    [userId, token, expiresAt]
  );
};

export const findValidResetToken = async (token) => {
  const rows = await query(
    `SELECT prt.id, prt.user_id, prt.token, prt.expires_at, u.email, u.is_active
     FROM password_reset_tokens prt
     INNER JOIN users u ON u.id = prt.user_id
     WHERE prt.token = ? AND prt.used_at IS NULL AND prt.expires_at > NOW()
     LIMIT 1`,
    [token]
  );
  return rows[0] || null;
};

export const markResetTokenUsed = async (tokenId) => {
  await query(
    'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?',
    [tokenId]
  );
};

export const generateResetToken = () => crypto.randomBytes(32).toString('hex');

export const sanitizeUser = (user) => {
  if (!user) return null;

  let permissions = user.permissions;
  if (typeof permissions === 'string') {
    permissions = JSON.parse(permissions);
  }

  return {
    id: user.id,
    roleId: user.role_id,
    roleName: user.role_name,
    username: user.username,
    email: user.email,
    fullName: user.full_name,
    phone: user.phone,
    isActive: Boolean(user.is_active),
    lastLoginAt: user.last_login_at,
    permissions,
  };
};
