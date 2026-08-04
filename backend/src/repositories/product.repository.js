import { query, getConnection } from '../../config/database.js';

const SORTABLE_COLUMNS = {
  id: 'p.id',
  name: 'p.name',
  sku: 'p.sku',
  barcode: 'p.barcode',
  categoryName: 'c.name',
  brandName: 'b.name',
  purchasePrice: 'p.purchase_price',
  sellingPrice: 'p.selling_price',
  gstRate: 'p.gst_rate',
  currentStock: 'p.current_stock',
  minStock: 'p.min_stock',
  status: 'p.status',
  createdAt: 'p.created_at',
};

export const formatProduct = (row) => {
  const currentStock = Number(row.current_stock);
  const minStock = Number(row.min_stock);

  return {
    id: row.id,
    categoryId: row.category_id,
    categoryName: row.category_name || null,
    brandId: row.brand_id,
    brandName: row.brand_name || null,
    name: row.name,
    sku: row.sku,
    barcode: row.barcode,
    purchasePrice: Number(row.purchase_price),
    sellingPrice: Number(row.selling_price),
    gstRate: Number(row.gst_rate),
    currentStock,
    minStock,
    isLowStock: row.status === 'active' && currentStock <= minStock,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const productSelect = `
  SELECT p.id, p.category_id, p.brand_id, p.name, p.sku, p.barcode,
         p.purchase_price, p.selling_price, p.gst_rate,
         p.current_stock, p.min_stock, p.status, p.created_at, p.updated_at,
         c.name AS category_name, b.name AS brand_name
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN brands b ON b.id = p.brand_id
`;

export const findProducts = async ({
  search = '',
  categoryId = null,
  brandId = null,
  status = null,
  lowStock = null,
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
    whereClause += ' AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ? OR c.name LIKE ? OR b.name LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term, term, term);
  }

  if (categoryId) {
    whereClause += ' AND p.category_id = ?';
    params.push(categoryId);
  }

  if (brandId) {
    whereClause += ' AND p.brand_id = ?';
    params.push(brandId);
  }

  if (status) {
    whereClause += ' AND p.status = ?';
    params.push(status);
  }

  if (lowStock === 'true' || lowStock === true || lowStock === '1' || lowStock === 1) {
    whereClause += " AND p.status = 'active' AND p.current_stock <= p.min_stock";
  }

  const countRows = await query(
    `SELECT COUNT(*) AS total
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN brands b ON b.id = p.brand_id
     ${whereClause}`,
    params
  );

  const rows = await query(
    `${productSelect}
     ${whereClause}
     ORDER BY ${sortColumn} ${order}
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    products: rows.map(formatProduct),
    total: countRows[0]?.total || 0,
  };
};

export const findProductById = async (productId) => {
  const rows = await query(
    `${productSelect} WHERE p.id = ? LIMIT 1`,
    [productId]
  );
  return rows[0] || null;
};

export const findProductBySku = async (sku, excludeId = null) => {
  let sql = 'SELECT id, sku FROM products WHERE LOWER(sku) = LOWER(?)';
  const params = [sku];
  if (excludeId) {
    sql += ' AND id != ?';
    params.push(excludeId);
  }
  sql += ' LIMIT 1';
  const rows = await query(sql, params);
  return rows[0] || null;
};

export const findProductByBarcode = async (barcode, excludeId = null) => {
  if (!barcode) return null;

  let sql = 'SELECT id, barcode FROM products WHERE barcode = ?';
  const params = [barcode];
  if (excludeId) {
    sql += ' AND id != ?';
    params.push(excludeId);
  }
  sql += ' LIMIT 1';
  const rows = await query(sql, params);
  return rows[0] || null;
};

export const createProductRecord = async (connection, data) => {
  const [result] = await connection.execute(
    `INSERT INTO products (
       category_id, brand_id, name, sku, barcode,
       purchase_price, selling_price, gst_rate,
       current_stock, min_stock, status
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.categoryId || null,
      data.brandId || null,
      data.name,
      data.sku,
      data.barcode || null,
      data.purchasePrice,
      data.sellingPrice,
      data.gstRate,
      data.currentStock,
      data.minStock,
      data.status,
    ]
  );
  return result.insertId;
};

export const updateProductRecord = async (connection, productId, data) => {
  const fields = [];
  const values = [];

  if (data.categoryId !== undefined) { fields.push('category_id = ?'); values.push(data.categoryId || null); }
  if (data.brandId !== undefined) { fields.push('brand_id = ?'); values.push(data.brandId || null); }
  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.sku !== undefined) { fields.push('sku = ?'); values.push(data.sku); }
  if (data.barcode !== undefined) { fields.push('barcode = ?'); values.push(data.barcode || null); }
  if (data.purchasePrice !== undefined) { fields.push('purchase_price = ?'); values.push(data.purchasePrice); }
  if (data.sellingPrice !== undefined) { fields.push('selling_price = ?'); values.push(data.sellingPrice); }
  if (data.gstRate !== undefined) { fields.push('gst_rate = ?'); values.push(data.gstRate); }
  if (data.currentStock !== undefined) { fields.push('current_stock = ?'); values.push(data.currentStock); }
  if (data.minStock !== undefined) { fields.push('min_stock = ?'); values.push(data.minStock); }
  if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }

  if (fields.length === 0) return;

  fields.push('updated_at = NOW()');
  values.push(productId);

  await connection.execute(
    `UPDATE products SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
};

export const deleteProductRecord = async (productId) => {
  await query('DELETE FROM products WHERE id = ?', [productId]);
};

export const countProductTransactions = async (productId) => {
  const rows = await query(
    `SELECT
       (SELECT COUNT(*) FROM purchase_items WHERE product_id = ?) +
       (SELECT COUNT(*) FROM sale_items WHERE product_id = ?) AS total`,
    [productId, productId]
  );
  return rows[0]?.total || 0;
};

export { getConnection };
