import { query } from '../../config/database.js';

export const formatCategory = (row) => ({
  id: row.id,
  name: row.name,
  description: row.description,
  isActive: Boolean(row.is_active),
});

export const findActiveCategories = async () => {
  const rows = await query(
    `SELECT id, name, description, is_active
     FROM categories
     WHERE is_active = 1
     ORDER BY name ASC`
  );
  return rows.map(formatCategory);
};

export const findCategoryById = async (categoryId) => {
  const rows = await query(
    'SELECT id, name, description, is_active FROM categories WHERE id = ? LIMIT 1',
    [categoryId]
  );
  return rows[0] || null;
};
