USE cattle_feed_erp;

ALTER TABLE purchases DROP FOREIGN KEY fk_purchases_supplier_id;

ALTER TABLE purchases
  MODIFY supplier_id INT UNSIGNED NULL;

ALTER TABLE purchases
  ADD CONSTRAINT fk_purchases_supplier_id FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
    ON UPDATE CASCADE ON DELETE SET NULL;
