USE cattle_feed_erp;

ALTER TABLE cash_book
  ADD COLUMN party_name VARCHAR(150) DEFAULT NULL AFTER remarks,
  ADD COLUMN party_type ENUM('customer', 'supplier', 'other') DEFAULT NULL AFTER party_name,
  ADD COLUMN party_id INT UNSIGNED DEFAULT NULL AFTER party_type,
  ADD COLUMN source VARCHAR(40) NOT NULL DEFAULT 'manual' AFTER party_id,
  ADD COLUMN status ENUM('posted', 'reversed') NOT NULL DEFAULT 'posted' AFTER source,
  ADD COLUMN mode_balance_after DECIMAL(12, 2) NOT NULL DEFAULT 0.00 AFTER balance_after,
  ADD COLUMN updated_by INT UNSIGNED DEFAULT NULL AFTER created_by;

ALTER TABLE cash_book
  ADD KEY idx_cash_book_source (source),
  ADD KEY idx_cash_book_status (status),
  ADD KEY idx_cash_book_party (party_type, party_id);

UPDATE cash_book
SET source = 'manual'
WHERE reference_type = 'manual' OR reference_type IS NULL;

UPDATE cash_book
SET source = 'opening_balance'
WHERE reference_type = 'opening_balance';

UPDATE cash_book cb
LEFT JOIN sales s ON cb.reference_type = 'sale' AND cb.reference_id = s.id
LEFT JOIN customers c ON c.id = s.customer_id
SET cb.source = 'billing',
    cb.party_type = IF(c.id IS NULL, NULL, 'customer'),
    cb.party_id = c.id,
    cb.party_name = c.name
WHERE cb.reference_type = 'sale';

UPDATE cash_book cb
LEFT JOIN payments p ON cb.reference_type = 'payment' AND cb.reference_id = p.id
LEFT JOIN sales s ON cb.reference_type = 'payment' AND cb.reference_id = s.id
LEFT JOIN customers c ON c.id = COALESCE(p.customer_id, s.customer_id)
SET cb.source = 'billing',
    cb.party_type = IF(c.id IS NULL, NULL, 'customer'),
    cb.party_id = c.id,
    cb.party_name = c.name
WHERE cb.reference_type = 'payment';

DELETE cb FROM cash_book cb
INNER JOIN cash_book keep
  ON keep.source = cb.source
 AND keep.reference_type = cb.reference_type
 AND keep.reference_id = cb.reference_id
 AND keep.payment_method = cb.payment_method
 AND keep.id < cb.id
WHERE cb.reference_id IS NOT NULL;

ALTER TABLE cash_book
  ADD UNIQUE KEY uk_cash_book_source_ref (source, reference_type, reference_id, payment_method);

CREATE TABLE IF NOT EXISTS supplier_payments (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  supplier_id INT UNSIGNED NOT NULL,
  purchase_id INT UNSIGNED DEFAULT NULL,
  payment_date DATE NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  payment_method ENUM('cash', 'upi', 'card', 'bank', 'other') NOT NULL DEFAULT 'cash',
  reference_number VARCHAR(100) DEFAULT NULL,
  remarks TEXT DEFAULT NULL,
  created_by INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_supplier_payments_supplier_id (supplier_id),
  KEY idx_supplier_payments_purchase_id (purchase_id),
  KEY idx_supplier_payments_payment_date (payment_date),
  CONSTRAINT fk_supplier_payments_supplier_id FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_supplier_payments_purchase_id FOREIGN KEY (purchase_id) REFERENCES purchases (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_supplier_payments_created_by FOREIGN KEY (created_by) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
