import { query } from '../../config/database.js';

export const formatBrand = (row) => ({
  id: row.id,
  name: row.name,
  description: row.description,
  isActive: Boolean(row.is_active),
});

export const findActiveBrands = async () => {
  const rows = await query(
    `SELECT id, name, description, is_active
     FROM brands
     WHERE is_active = 1
     ORDER BY name ASC`
  );
  return rows.map(formatBrand);
};

export const findBrandById = async (brandId) => {
  const rows = await query(
    'SELECT id, name, description, is_active FROM brands WHERE id = ? LIMIT 1',
    [brandId]
  );
  return rows[0] || null;
};
