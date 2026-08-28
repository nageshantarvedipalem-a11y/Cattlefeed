USE cattle_feed_erp;

ALTER TABLE cash_book
  ADD COLUMN description VARCHAR(255) DEFAULT NULL AFTER category,
  ADD COLUMN reference_number VARCHAR(100) DEFAULT NULL AFTER payment_method,
  ADD COLUMN sort_index TINYINT UNSIGNED NOT NULL DEFAULT 1 AFTER balance_after,
  ADD COLUMN updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP AFTER created_at;

ALTER TABLE cash_book
  MODIFY COLUMN payment_method ENUM('cash', 'upi', 'card', 'bank', 'other') NOT NULL DEFAULT 'cash';

ALTER TABLE expenses
  MODIFY COLUMN payment_method ENUM('cash', 'upi', 'card', 'bank', 'other') NOT NULL DEFAULT 'cash';
