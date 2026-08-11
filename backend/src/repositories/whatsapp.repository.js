import { query } from '../../config/database.js';

const formatMessage = (row) => ({
  id: row.id,
  saleId: row.sale_id,
  customerId: row.customer_id,
  customerName: row.customer_name || null,
  invoiceNumber: row.invoice_number || null,
  phone: row.phone,
  messageType: row.message_type,
  messageBody: row.message_body,
  mediaFilename: row.media_filename,
  whatsappMessageId: row.whatsapp_message_id,
  status: row.status,
  errorMessage: row.error_message,
  sentBy: row.sent_by,
  sentByName: row.sent_by_name || null,
  createdAt: row.created_at,
});

export const createWhatsAppMessage = async (data) => {
  const result = await query(
    `INSERT INTO whatsapp_messages
     (sale_id, customer_id, phone, message_type, message_body, media_filename,
      whatsapp_message_id, status, error_message, sent_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.saleId || null,
      data.customerId || null,
      data.phone,
      data.messageType,
      data.messageBody || null,
      data.mediaFilename || null,
      data.whatsappMessageId || null,
      data.status || 'pending',
      data.errorMessage || null,
      data.sentBy || null,
    ]
  );

  return result.insertId;
};

export const updateWhatsAppMessageStatus = async (
  id,
  status,
  whatsappMessageId = null,
  errorMessage = null,
  messageBody = null
) => {
  await query(
    `UPDATE whatsapp_messages
     SET status = ?,
         whatsapp_message_id = COALESCE(?, whatsapp_message_id),
         error_message = ?,
         message_body = COALESCE(?, message_body)
     WHERE id = ?`,
    [status, whatsappMessageId, errorMessage, messageBody, id]
  );
};

export const findWhatsAppMessages = async ({ page = 1, limit = 15, messageType = null, status = null }) => {
  const offset = (page - 1) * limit;
  const conditions = [];
  const params = [];

  if (messageType) {
    conditions.push('wm.message_type = ?');
    params.push(messageType);
  }

  if (status) {
    conditions.push('wm.status = ?');
    params.push(status);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const countRows = await query(
    `SELECT COUNT(*) AS total FROM whatsapp_messages wm ${whereClause}`,
    params
  );
  const total = Number(countRows[0]?.total ?? 0);

  const rows = await query(
    `SELECT wm.*, c.name AS customer_name, s.invoice_number, u.full_name AS sent_by_name
     FROM whatsapp_messages wm
     LEFT JOIN customers c ON c.id = wm.customer_id
     LEFT JOIN sales s ON s.id = wm.sale_id
     LEFT JOIN users u ON u.id = wm.sent_by
     ${whereClause}
     ORDER BY wm.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return {
    messages: rows.map(formatMessage),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

export const getWhatsAppMessageStats = async () => {
  const rows = await query(
    `SELECT
       COUNT(*) AS total,
       SUM(status = 'sent') AS sent,
       SUM(status = 'failed') AS failed,
       SUM(DATE(created_at) = CURDATE()) AS today
     FROM whatsapp_messages`
  );

  return {
    total: Number(rows[0]?.total ?? 0),
    sent: Number(rows[0]?.sent ?? 0),
    failed: Number(rows[0]?.failed ?? 0),
    today: Number(rows[0]?.today ?? 0),
  };
};
