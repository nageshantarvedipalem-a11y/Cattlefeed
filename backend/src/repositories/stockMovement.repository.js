import { query } from '../../config/database.js';

export const formatStockMovement = (row) => ({
  id: row.id,
  productId: row.product_id,
  productName: row.product_name,
  productSku: row.product_sku,
  movementType: row.movement_type,
  quantity: Number(row.quantity),
  referenceType: row.reference_type,
  referenceId: row.reference_id,
  purchasePrice: row.purchase_price !== null ? Number(row.purchase_price) : null,
  sellingPrice: row.selling_price !== null ? Number(row.selling_price) : null,
  balanceAfter: Number(row.balance_after),
  remarks: row.remarks,
  createdBy: row.created_by,
  createdByName: row.created_by_name || null,
  createdAt: row.created_at,
});

const buildDateFilter = (period, dateFrom, dateTo) => {
  if (dateFrom && dateTo) {
    return {
      clause: ' AND DATE(sm.created_at) BETWEEN ? AND ?',
      params: [dateFrom, dateTo],
    };
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const today = `${year}-${month}-${day}`;

  switch (period) {
    case 'daily':
      return { clause: ' AND DATE(sm.created_at) = ?', params: [today] };
    case 'monthly':
      return { clause: ' AND YEAR(sm.created_at) = ? AND MONTH(sm.created_at) = ?', params: [year, now.getMonth() + 1] };
    case 'yearly':
      return { clause: ' AND YEAR(sm.created_at) = ?', params: [year] };
    default:
      return { clause: '', params: [] };
  }
};

export const findStockMovements = async ({
  search = '',
  productId = null,
  movementType = null,
  referenceType = null,
  period = null,
  dateFrom = null,
  dateTo = null,
  page = 1,
  limit = 10,
  sortOrder = 'desc',
}) => {
  const offset = (page - 1) * limit;
  const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  let whereClause = 'WHERE 1=1';
  const params = [];

  if (search) {
    whereClause += ' AND (p.name LIKE ? OR p.sku LIKE ? OR sm.remarks LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  if (productId) {
    whereClause += ' AND sm.product_id = ?';
    params.push(productId);
  }

  if (movementType) {
    whereClause += ' AND sm.movement_type = ?';
    params.push(movementType);
  }

  if (referenceType) {
    whereClause += ' AND sm.reference_type = ?';
    params.push(referenceType);
  }

  const dateFilter = buildDateFilter(period, dateFrom, dateTo);
  whereClause += dateFilter.clause;
  params.push(...dateFilter.params);

  const baseFrom = `
    FROM stock_movements sm
    INNER JOIN products p ON p.id = sm.product_id
    LEFT JOIN users u ON u.id = sm.created_by
  `;

  const countRows = await query(
    `SELECT COUNT(*) AS total ${baseFrom} ${whereClause}`,
    params
  );

  const rows = await query(
    `SELECT sm.id, sm.product_id, p.name AS product_name, p.sku AS product_sku,
            sm.movement_type, sm.quantity, sm.reference_type, sm.reference_id,
            sm.purchase_price, sm.selling_price, sm.balance_after, sm.remarks,
            sm.created_by, u.full_name AS created_by_name, sm.created_at
     ${baseFrom}
     ${whereClause}
     ORDER BY sm.created_at ${order}, sm.id ${order}
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    movements: rows.map(formatStockMovement),
    total: countRows[0]?.total || 0,
  };
};

export const findStockMovementsForExport = async (filters) => {
  const { movements } = await findStockMovements({
    ...filters,
    page: 1,
    limit: 10000,
  });
  return movements;
};

export const findProductStockHistory = async (productId, page = 1, limit = 20) => {
  return findStockMovements({
    productId,
    page,
    limit,
    sortOrder: 'desc',
  });
};

export const createStockMovementRecord = async (connection, data) => {
  const [result] = await connection.execute(
    `INSERT INTO stock_movements (
       product_id, movement_type, quantity, reference_type, reference_id,
       purchase_price, selling_price, balance_after, remarks, created_by
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.productId,
      data.movementType,
      data.quantity,
      data.referenceType,
      data.referenceId || null,
      data.purchasePrice ?? null,
      data.sellingPrice ?? null,
      data.balanceAfter,
      data.remarks || null,
      data.createdBy,
    ]
  );
  return result.insertId;
};

export const getProductStockForUpdate = async (connection, productId) => {
  const [rows] = await connection.execute(
    `SELECT id, name, current_stock, min_stock, status, purchase_price, selling_price, gst_rate
     FROM products WHERE id = ? FOR UPDATE`,
    [productId]
  );
  return rows[0] || null;
};

export const updateProductStock = async (connection, productId, newStock, prices = {}) => {
  const fields = ['current_stock = ?'];
  const values = [newStock];

  if (prices.purchasePrice !== undefined) {
    fields.push('purchase_price = ?');
    values.push(prices.purchasePrice);
  }
  if (prices.sellingPrice !== undefined) {
    fields.push('selling_price = ?');
    values.push(prices.sellingPrice);
  }
  if (prices.gstRate !== undefined) {
    fields.push('gst_rate = ?');
    values.push(prices.gstRate);
  }

  fields.push('updated_at = NOW()');
  values.push(productId);

  await connection.execute(
    `UPDATE products SET ${fields.join(', ')} WHERE id = ?`,
    values
  );
};
