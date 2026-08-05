import { query, getConnection } from '../../config/database.js';

const SORTABLE_COLUMNS = {
  id: 's.id',
  invoiceNumber: 's.invoice_number',
  saleDate: 's.sale_date',
  totalAmount: 's.total_amount',
  paidAmount: 's.paid_amount',
  pendingAmount: 's.pending_amount',
  paymentStatus: 's.payment_status',
  createdAt: 's.created_at',
  customerName: 'c.name',
};

export const formatSaleItem = (row) => ({
  id: row.id,
  productId: row.product_id,
  productName: row.product_name,
  productSku: row.product_sku,
  quantity: Number(row.quantity),
  purchasePrice: Number(row.purchase_price),
  sellingPrice: Number(row.selling_price),
  gstRate: Number(row.gst_rate),
  taxAmount: Number(row.tax_amount),
  discountAmount: Number(row.discount_amount),
  totalAmount: Number(row.total_amount),
  profitAmount: Number(row.profit_amount),
});

export const formatSalePayment = (row) => ({
  id: row.id,
  paymentMethod: row.payment_method,
  amount: Number(row.amount),
  referenceNumber: row.reference_number,
  createdAt: row.created_at,
});

export const formatSale = (row, items = [], payments = []) => ({
  id: row.id,
  invoiceNumber: row.invoice_number,
  customerId: row.customer_id,
  customerName: row.customer_name || null,
  customerPhone: row.customer_phone || null,
  customerVillage: row.customer_village || null,
  customerAddress: row.customer_address || null,
  saleDate: row.sale_date,
  subtotal: Number(row.subtotal),
  taxAmount: Number(row.tax_amount),
  discountAmount: Number(row.discount_amount),
  totalAmount: Number(row.total_amount),
  paidAmount: Number(row.paid_amount),
  pendingAmount: Number(row.pending_amount),
  paymentStatus: row.payment_status,
  primaryPaymentMethod: row.primary_payment_method,
  dueDate: row.due_date,
  remarks: row.remarks,
  createdBy: row.created_by,
  createdByName: row.created_by_name || null,
  totalProfit: items.reduce((sum, item) => sum + Number(item.profit_amount || item.profitAmount || 0), 0),
  items: items.map((item) => (item.product_id ? formatSaleItem(item) : item)),
  payments: payments.map((p) => (p.payment_method ? formatSalePayment(p) : p)),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const saleSelect = `
  SELECT s.id, s.invoice_number, s.customer_id, c.name AS customer_name, c.phone AS customer_phone,
         c.village AS customer_village, c.address AS customer_address,
         s.sale_date, s.subtotal, s.tax_amount, s.discount_amount, s.total_amount,
         s.paid_amount, s.pending_amount, s.payment_status, s.primary_payment_method,
         s.due_date, s.remarks, s.created_by, u.full_name AS created_by_name,
         s.created_at, s.updated_at
  FROM sales s
  LEFT JOIN customers c ON c.id = s.customer_id
  LEFT JOIN users u ON u.id = s.created_by
`;

export const findSales = async ({
  search = '',
  customerId = null,
  paymentStatus = null,
  dateFrom = null,
  dateTo = null,
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
    whereClause += ' AND (s.invoice_number LIKE ? OR c.name LIKE ? OR c.phone LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  if (customerId) {
    whereClause += ' AND s.customer_id = ?';
    params.push(customerId);
  }

  if (paymentStatus) {
    whereClause += ' AND s.payment_status = ?';
    params.push(paymentStatus);
  }

  if (dateFrom && dateTo) {
    whereClause += ' AND DATE(s.sale_date) BETWEEN ? AND ?';
    params.push(dateFrom, dateTo);
  }

  const countRows = await query(
    `SELECT COUNT(*) AS total FROM sales s LEFT JOIN customers c ON c.id = s.customer_id ${whereClause}`,
    params
  );

  const rows = await query(
    `${saleSelect} ${whereClause} ORDER BY ${sortColumn} ${order} LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    sales: rows.map((row) => formatSale(row)),
    total: countRows[0]?.total || 0,
  };
};

export const findSaleById = async (saleId) => {
  const rows = await query(`${saleSelect} WHERE s.id = ? LIMIT 1`, [saleId]);
  return rows[0] || null;
};

export const findSaleByInvoiceNumber = async (invoiceNumber) => {
  const rows = await query(`${saleSelect} WHERE s.invoice_number = ? LIMIT 1`, [invoiceNumber]);
  return rows[0] || null;
};

export const findSaleItems = async (saleId) => {
  return query(
    `SELECT si.id, si.product_id, p.name AS product_name, p.sku AS product_sku,
            si.quantity, si.purchase_price, si.selling_price, si.gst_rate,
            si.tax_amount, si.discount_amount, si.total_amount, si.profit_amount
     FROM sale_items si
     INNER JOIN products p ON p.id = si.product_id
     WHERE si.sale_id = ?
     ORDER BY si.id ASC`,
    [saleId]
  );
};

export const findSalePayments = async (saleId) => {
  return query(
    `SELECT id, payment_method, amount, reference_number, created_at
     FROM sale_payments WHERE sale_id = ? ORDER BY id ASC`,
    [saleId]
  );
};

export const createSaleRecord = async (connection, data) => {
  const [result] = await connection.execute(
    `INSERT INTO sales (
       invoice_number, customer_id, sale_date, subtotal, tax_amount, discount_amount,
       total_amount, paid_amount, pending_amount, payment_status, primary_payment_method,
       due_date, remarks, created_by
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.invoiceNumber,
      data.customerId || null,
      data.saleDate,
      data.subtotal,
      data.taxAmount,
      data.discountAmount,
      data.totalAmount,
      data.paidAmount,
      data.pendingAmount,
      data.paymentStatus,
      data.primaryPaymentMethod,
      data.dueDate || null,
      data.remarks || null,
      data.createdBy,
    ]
  );
  return result.insertId;
};

export const createSaleItemRecord = async (connection, data) => {
  await connection.execute(
    `INSERT INTO sale_items (
       sale_id, product_id, quantity, purchase_price, selling_price, gst_rate,
       tax_amount, discount_amount, total_amount, profit_amount
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.saleId,
      data.productId,
      data.quantity,
      data.purchasePrice,
      data.sellingPrice,
      data.gstRate,
      data.taxAmount,
      data.discountAmount,
      data.totalAmount,
      data.profitAmount,
    ]
  );
};

export const createSalePaymentRecord = async (connection, data) => {
  await connection.execute(
    `INSERT INTO sale_payments (sale_id, payment_method, amount, reference_number)
     VALUES (?, ?, ?, ?)`,
    [data.saleId, data.paymentMethod, data.amount, data.referenceNumber || null]
  );
};

export const updateSalePaymentAmounts = async (connection, saleId, data) => {
  await connection.execute(
    `UPDATE sales
     SET paid_amount = ?, pending_amount = ?, payment_status = ?, updated_at = NOW()
     WHERE id = ?`,
    [data.paidAmount, data.pendingAmount, data.paymentStatus, saleId]
  );
};

export const searchPosProducts = async (search = '', barcode = '') => {
  if (barcode) {
    const rows = await query(
      `SELECT p.id, p.name, p.sku, p.barcode, p.selling_price, p.purchase_price,
              p.gst_rate, p.current_stock, c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.barcode = ? AND p.status = 'active'
       LIMIT 1`,
      [barcode]
    );
    return rows.map(formatPosProduct);
  }

  const term = `%${search.trim()}%`;
  const hasSearch = Boolean(search.trim());
  const rows = await query(
    `SELECT p.id, p.name, p.sku, p.barcode, p.selling_price, p.purchase_price,
            p.gst_rate, p.current_stock, c.name AS category_name
     FROM products p
     LEFT JOIN categories c ON c.id = p.category_id
     WHERE p.status = 'active'
       AND p.current_stock > 0
       ${hasSearch ? 'AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)' : ''}
     ORDER BY p.name ASC
     LIMIT ${hasSearch ? 50 : 500}`,
    hasSearch ? [term, term, term] : []
  );
  return rows.map(formatPosProduct);
};

const formatPosProduct = (row) => ({
  id: row.id,
  name: row.name,
  sku: row.sku,
  barcode: row.barcode,
  sellingPrice: Number(row.selling_price),
  purchasePrice: Number(row.purchase_price),
  gstRate: Number(row.gst_rate),
  currentStock: Number(row.current_stock),
  categoryName: row.category_name,
});

export { getConnection };
