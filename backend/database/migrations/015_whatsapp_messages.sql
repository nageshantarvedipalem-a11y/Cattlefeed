-- Phase 15: WhatsApp message log table (run once on existing databases)

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  sale_id INT UNSIGNED DEFAULT NULL,
  customer_id INT UNSIGNED DEFAULT NULL,
  phone VARCHAR(20) NOT NULL,
  message_type ENUM('invoice', 'reminder', 'test', 'text') NOT NULL,
  message_body TEXT DEFAULT NULL,
  media_filename VARCHAR(255) DEFAULT NULL,
  whatsapp_message_id VARCHAR(100) DEFAULT NULL,
  status ENUM('sent', 'failed', 'pending') NOT NULL DEFAULT 'pending',
  error_message TEXT DEFAULT NULL,
  sent_by INT UNSIGNED DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_whatsapp_messages_sale_id (sale_id),
  KEY idx_whatsapp_messages_customer_id (customer_id),
  KEY idx_whatsapp_messages_status (status),
  KEY idx_whatsapp_messages_created_at (created_at),
  CONSTRAINT fk_whatsapp_messages_sale_id FOREIGN KEY (sale_id) REFERENCES sales (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_whatsapp_messages_customer_id FOREIGN KEY (customer_id) REFERENCES customers (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_whatsapp_messages_sent_by FOREIGN KEY (sent_by) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO settings (setting_key, setting_value, description) VALUES
('whatsapp_auto_send_invoice', 'true', 'Auto-send invoice PDF via WhatsApp after billing');
