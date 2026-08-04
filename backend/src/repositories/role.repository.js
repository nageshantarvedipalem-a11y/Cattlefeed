import { query } from '../../config/database.js';

export const findAllRoles = async () => {
  return query(
    `SELECT id, name, is_active
     FROM roles
     WHERE is_active = 1
     ORDER BY id ASC`
  );
};

export const findRoleById = async (roleId) => {
  const rows = await query(
    'SELECT id, name, is_active FROM roles WHERE id = ? LIMIT 1',
    [roleId]
  );
  return rows[0] || null;
};

export const findRoleByName = async (name) => {
  const rows = await query(
    'SELECT id, name FROM roles WHERE name = ? LIMIT 1',
    [name]
  );
  return rows[0] || null;
};
