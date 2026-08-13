import crypto from 'crypto';
import { query } from '../../config/database.js';
import { getPublicAppUrl } from '../../config/app.config.js';

export const buildProfileImageUrl = (profileImage) => {
  if (!profileImage) return null;
  if (profileImage.startsWith('http')) return profileImage;
  const base = getPublicAppUrl();
  return base ? `${base}${profileImage}` : profileImage;
};

export const findUserByIdentifier = async (identifier) => {
  const rows = await query(
    `SELECT u.id, u.role_id, u.username, u.email, u.password_hash, u.full_name,
            u.phone, u.profile_image, u.is_active, u.last_login_at, r.name AS role_name, r.permissions
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
    `SELECT u.id, u.role_id, u.username, u.email, u.full_name, u.phone, u.profile_image,
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

export const findConflictingUser = async (username, email, excludeUserId) => {
  const rows = await query(
    `SELECT id, username, email
     FROM users
     WHERE id <> ? AND (username = ? OR email = ?)
     LIMIT 1`,
    [excludeUserId, username, email]
  );
  return rows[0] || null;
};

export const updateUserProfile = async (userId, { fullName, username, email, phone }) => {
  await query(
    `UPDATE users
     SET full_name = ?, username = ?, email = ?, phone = ?, updated_at = NOW()
     WHERE id = ?`,
    [fullName, username, email, phone || null, userId]
  );
};

export const updateUserProfileImage = async (userId, profileImage) => {
  await query(
    'UPDATE users SET profile_image = ?, updated_at = NOW() WHERE id = ?',
    [profileImage, userId]
  );
};

export const getUserProfileImage = async (userId) => {
  const rows = await query(
    'SELECT profile_image FROM users WHERE id = ? LIMIT 1',
    [userId]
  );
  return rows[0]?.profile_image || null;
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
    profileImage: user.profile_image || null,
    profileImageUrl: buildProfileImageUrl(user.profile_image),
    isActive: Boolean(user.is_active),
    lastLoginAt: user.last_login_at,
    permissions,
  };
};
