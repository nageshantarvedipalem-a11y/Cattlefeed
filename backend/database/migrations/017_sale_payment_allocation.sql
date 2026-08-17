USE cattle_feed_erp;

ALTER TABLE sales
  ADD COLUMN previous_pending_balance DECIMAL(12, 2) NOT NULL DEFAULT 0.00 AFTER pending_amount,
  ADD COLUMN old_balance_paid DECIMAL(12, 2) NOT NULL DEFAULT 0.00 AFTER previous_pending_balance,
  ADD COLUMN amount_received DECIMAL(12, 2) NOT NULL DEFAULT 0.00 AFTER old_balance_paid,
  ADD COLUMN total_pending_after DECIMAL(12, 2) DEFAULT NULL AFTER amount_received;
