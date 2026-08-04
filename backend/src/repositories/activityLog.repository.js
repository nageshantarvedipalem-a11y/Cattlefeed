import { query } from '../../config/database.js';

export const logActivity = async ({
  userId = null,
  action,
  entityType = null,
  entityId = null,
  details = null,
  ipAddress = null,
}) => {
  await query(
    `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details, ip_address)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      userId,
      action,
      entityType,
      entityId,
      details ? JSON.stringify(details) : null,
      ipAddress,
    ]
  );
};
