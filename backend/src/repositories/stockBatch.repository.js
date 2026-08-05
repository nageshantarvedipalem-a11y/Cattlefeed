import { query } from '../../config/database.js';

export const findAvailableStockBatches = async (search = '') => {
  let whereClause = 'WHERE pr.status = \'active\' AND pr.current_stock > 0';
  const params = [];

  if (search.trim()) {
    whereClause += ' AND (s.name LIKE ? OR p.invoice_number LIKE ? OR pr.name LIKE ?)';
    const term = `%${search.trim()}%`;
    params.push(term, term, term);
  }

  const rows = await query(
    `SELECT
       p.id,
       p.invoice_number AS batch_number,
       p.purchase_date,
       s.name AS supplier_name,
       COUNT(DISTINCT pi.product_id) AS product_count,
       COALESCE(SUM(pi.quantity), 0) AS received_quantity,
       COALESCE(SUM(pi.quantity * pi.purchase_price), 0) AS stock_value,
       MIN(pi.purchase_price) AS min_purchase_price,
       MAX(pi.selling_price) AS max_selling_price
     FROM purchases p
     INNER JOIN suppliers s ON s.id = p.supplier_id
     INNER JOIN purchase_items pi ON pi.purchase_id = p.id
     INNER JOIN products pr ON pr.id = pi.product_id
     ${whereClause}
     GROUP BY p.id, p.invoice_number, p.purchase_date, s.name
     ORDER BY p.purchase_date DESC, p.id DESC`,
    params
  );

  return rows.map((row) => ({
    id: row.id,
    batchNumber: row.batch_number || `BATCH-${row.id}`,
    supplierName: row.supplier_name,
    purchaseDate: row.purchase_date,
    productCount: Number(row.product_count),
    receivedQuantity: Number(row.received_quantity),
    stockValue: Number(row.stock_value),
    minPurchasePrice: Number(row.min_purchase_price),
    maxSellingPrice: Number(row.max_selling_price),
  }));
};

export const findStockBatchProducts = async (purchaseId, search = '', barcode = '') => {
  let whereClause = 'WHERE pi.purchase_id = ? AND pr.status = \'active\' AND pr.current_stock > 0';
  const params = [purchaseId];

  if (search.trim()) {
    whereClause += ' AND (pr.name LIKE ? OR pr.sku LIKE ? OR pr.barcode LIKE ?)';
    const term = `%${search.trim()}%`;
    params.push(term, term, term);
  }

  if (barcode.trim()) {
    whereClause += ' AND pr.barcode = ?';
    params.push(barcode.trim());
  }

  const rows = await query(
    `SELECT
       pr.id,
       pr.name,
       pr.sku,
       pr.barcode,
       pr.gst_rate,
       pr.current_stock,
       pi.purchase_price,
       pi.selling_price,
       pi.quantity AS batch_quantity,
       p.invoice_number AS batch_number,
       s.name AS supplier_name,
       p.purchase_date
     FROM purchase_items pi
     INNER JOIN products pr ON pr.id = pi.product_id
     INNER JOIN purchases p ON p.id = pi.purchase_id
     INNER JOIN suppliers s ON s.id = p.supplier_id
     ${whereClause}
     ORDER BY pr.name ASC`,
    params
  );

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    sku: row.sku,
    barcode: row.barcode,
    gstRate: Number(row.gst_rate),
    currentStock: Number(row.current_stock),
    purchasePrice: Number(row.purchase_price),
    sellingPrice: Number(row.selling_price),
    batchQuantity: Number(row.batch_quantity),
    batchNumber: row.batch_number || `BATCH-${purchaseId}`,
    supplierName: row.supplier_name,
    purchaseDate: row.purchase_date,
    purchaseId,
  }));
};
