-- ============================================================
-- Cattle Feed ERP - MySQL Database Schema
-- Version: 1.0.0 (Phase 1)
-- Engine: InnoDB | Charset: utf8mb4
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS cattle_feed_erp
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE cattle_feed_erp;

-- ============================================================
-- ROLES & USERS
-- ============================================================

CREATE TABLE roles (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL,
  permissions JSON NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_roles_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  role_id INT UNSIGNED NOT NULL,
  username VARCHAR(50) NOT NULL,
  email VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  profile_image VARCHAR(255) DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_username (username),
  UNIQUE KEY uk_users_email (email),
  KEY idx_users_role_id (role_id),
  KEY idx_users_is_active (is_active),
  CONSTRAINT fk_users_role_id FOREIGN KEY (role_id) REFERENCES roles (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE password_reset_tokens (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  token VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_password_reset_token (token),
  KEY idx_password_reset_user_id (user_id),
  KEY idx_password_reset_expires_at (expires_at),
  CONSTRAINT fk_password_reset_user_id FOREIGN KEY (user_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- MASTER DATA: CATEGORIES, BRANDS, PRODUCTS
-- ============================================================

CREATE TABLE categories (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description TEXT DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_categories_name (name),
  KEY idx_categories_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE brands (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description TEXT DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_brands_name (name),
  KEY idx_brands_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE products (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  category_id INT UNSIGNED DEFAULT NULL,
  brand_id INT UNSIGNED DEFAULT NULL,
  name VARCHAR(200) NOT NULL,
  sku VARCHAR(50) NOT NULL,
  barcode VARCHAR(50) DEFAULT NULL,
  purchase_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  selling_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  gst_rate DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  current_stock DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
  min_stock DECIMAL(12, 3) NOT NULL DEFAULT 0.000,
  status ENUM('active', 'inactive', 'discontinued') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_products_sku (sku),
  UNIQUE KEY uk_products_barcode (barcode),
  KEY idx_products_category_id (category_id),
  KEY idx_products_brand_id (brand_id),
  KEY idx_products_name (name),
  KEY idx_products_status (status),
  KEY idx_products_current_stock (current_stock),
  CONSTRAINT fk_products_category_id FOREIGN KEY (category_id) REFERENCES categories (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_products_brand_id FOREIGN KEY (brand_id) REFERENCES brands (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- SUPPLIERS & CUSTOMERS
-- ============================================================

CREATE TABLE suppliers (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  address TEXT DEFAULT NULL,
  gst_number VARCHAR(20) DEFAULT NULL,
  opening_balance DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  notes TEXT DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_suppliers_name (name),
  KEY idx_suppliers_phone (phone),
  KEY idx_suppliers_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE customers (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  village VARCHAR(100) DEFAULT NULL,
  address TEXT DEFAULT NULL,
  opening_balance DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  opening_balance_type ENUM('debit', 'credit') NOT NULL DEFAULT 'debit',
  credit_limit DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  notes TEXT DEFAULT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_customers_phone (phone),
  KEY idx_customers_name (name),
  KEY idx_customers_village (village),
  KEY idx_customers_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- PURCHASES (STOCK IN)
-- ============================================================

CREATE TABLE purchases (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  supplier_id INT UNSIGNED DEFAULT NULL,
  invoice_number VARCHAR(50) NOT NULL,
  purchase_date DATE NOT NULL,
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  tax_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  paid_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  payment_status ENUM('paid', 'partial', 'pending') NOT NULL DEFAULT 'pending',
  remarks TEXT DEFAULT NULL,
  created_by INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_purchases_supplier_id (supplier_id),
  KEY idx_purchases_invoice_number (invoice_number),
  KEY idx_purchases_purchase_date (purchase_date),
  KEY idx_purchases_created_by (created_by),
  CONSTRAINT fk_purchases_supplier_id FOREIGN KEY (supplier_id) REFERENCES suppliers (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_purchases_created_by FOREIGN KEY (created_by) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE purchase_items (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  purchase_id INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NOT NULL,
  quantity DECIMAL(12, 3) NOT NULL,
  purchase_price DECIMAL(12, 2) NOT NULL,
  selling_price DECIMAL(12, 2) NOT NULL,
  gst_rate DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  tax_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (id),
  KEY idx_purchase_items_purchase_id (purchase_id),
  KEY idx_purchase_items_product_id (product_id),
  CONSTRAINT fk_purchase_items_purchase_id FOREIGN KEY (purchase_id) REFERENCES purchases (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_purchase_items_product_id FOREIGN KEY (product_id) REFERENCES products (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- SALES (BILLING / POS)
-- ============================================================

CREATE TABLE sales (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  invoice_number VARCHAR(50) NOT NULL,
  customer_id INT UNSIGNED DEFAULT NULL,
  sale_date DATETIME NOT NULL,
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  tax_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  paid_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  pending_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  previous_pending_balance DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  old_balance_paid DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  amount_received DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  total_pending_after DECIMAL(12, 2) DEFAULT NULL,
  payment_status ENUM('paid', 'partial', 'pending') NOT NULL DEFAULT 'paid',
  primary_payment_method ENUM('cash', 'upi', 'card', 'bank', 'credit', 'split') NOT NULL DEFAULT 'cash',
  due_date DATE DEFAULT NULL,
  remarks TEXT DEFAULT NULL,
  created_by INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_sales_invoice_number (invoice_number),
  KEY idx_sales_customer_id (customer_id),
  KEY idx_sales_sale_date (sale_date),
  KEY idx_sales_payment_status (payment_status),
  KEY idx_sales_created_by (created_by),
  CONSTRAINT fk_sales_customer_id FOREIGN KEY (customer_id) REFERENCES customers (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_sales_created_by FOREIGN KEY (created_by) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sale_items (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  sale_id INT UNSIGNED NOT NULL,
  product_id INT UNSIGNED NOT NULL,
  quantity DECIMAL(12, 3) NOT NULL,
  purchase_price DECIMAL(12, 2) NOT NULL,
  selling_price DECIMAL(12, 2) NOT NULL,
  gst_rate DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  tax_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  profit_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (id),
  KEY idx_sale_items_sale_id (sale_id),
  KEY idx_sale_items_product_id (product_id),
  CONSTRAINT fk_sale_items_sale_id FOREIGN KEY (sale_id) REFERENCES sales (id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_sale_items_product_id FOREIGN KEY (product_id) REFERENCES products (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sale_payments (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  sale_id INT UNSIGNED NOT NULL,
  payment_method ENUM('cash', 'upi', 'card', 'bank', 'credit') NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  reference_number VARCHAR(100) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_sale_payments_sale_id (sale_id),
  KEY idx_sale_payments_payment_method (payment_method),
  CONSTRAINT fk_sale_payments_sale_id FOREIGN KEY (sale_id) REFERENCES sales (id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- PAYMENTS (PENDING PAYMENT RECEIPTS)
-- ============================================================

CREATE TABLE payments (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id INT UNSIGNED NOT NULL,
  sale_id INT UNSIGNED DEFAULT NULL,
  payment_date DATE NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  payment_method ENUM('cash', 'upi', 'card', 'bank') NOT NULL DEFAULT 'cash',
  reference_number VARCHAR(100) DEFAULT NULL,
  remarks TEXT DEFAULT NULL,
  created_by INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_payments_customer_id (customer_id),
  KEY idx_payments_sale_id (sale_id),
  KEY idx_payments_payment_date (payment_date),
  KEY idx_payments_created_by (created_by),
  CONSTRAINT fk_payments_customer_id FOREIGN KEY (customer_id) REFERENCES customers (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_payments_sale_id FOREIGN KEY (sale_id) REFERENCES sales (id)
    ON UPDATE CASCADE ON DELETE SET NULL,
  CONSTRAINT fk_payments_created_by FOREIGN KEY (created_by) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- CUSTOMER LEDGER
-- ============================================================

CREATE TABLE customer_ledger (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_id INT UNSIGNED NOT NULL,
  transaction_date DATETIME NOT NULL,
  transaction_type ENUM('opening', 'sale', 'payment', 'adjustment', 'refund') NOT NULL,
  reference_type VARCHAR(50) DEFAULT NULL,
  reference_id INT UNSIGNED DEFAULT NULL,
  debit DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  credit DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  balance DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  remarks TEXT DEFAULT NULL,
  created_by INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_customer_ledger_customer_id (customer_id),
  KEY idx_customer_ledger_transaction_date (transaction_date),
  KEY idx_customer_ledger_transaction_type (transaction_type),
  KEY idx_customer_ledger_reference (reference_type, reference_id),
  CONSTRAINT fk_customer_ledger_customer_id FOREIGN KEY (customer_id) REFERENCES customers (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_customer_ledger_created_by FOREIGN KEY (created_by) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- CASH BOOK
-- ============================================================

CREATE TABLE cash_book (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  transaction_date DATE NOT NULL,
  transaction_type ENUM('cash_in', 'cash_out', 'income', 'expense', 'transfer') NOT NULL,
  category VARCHAR(100) DEFAULT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  payment_method ENUM('cash', 'upi', 'card', 'bank') NOT NULL DEFAULT 'cash',
  reference_type VARCHAR(50) DEFAULT NULL,
  reference_id INT UNSIGNED DEFAULT NULL,
  balance_after DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  remarks TEXT DEFAULT NULL,
  created_by INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_cash_book_transaction_date (transaction_date),
  KEY idx_cash_book_transaction_type (transaction_type),
  KEY idx_cash_book_reference (reference_type, reference_id),
  KEY idx_cash_book_created_by (created_by),
  CONSTRAINT fk_cash_book_created_by FOREIGN KEY (created_by) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- EXPENSES
-- ============================================================

CREATE TABLE expenses (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  expense_date DATE NOT NULL,
  category VARCHAR(100) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  payment_method ENUM('cash', 'upi', 'card', 'bank') NOT NULL DEFAULT 'cash',
  description TEXT DEFAULT NULL,
  created_by INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_expenses_expense_date (expense_date),
  KEY idx_expenses_category (category),
  KEY idx_expenses_created_by (created_by),
  CONSTRAINT fk_expenses_created_by FOREIGN KEY (created_by) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- STOCK MOVEMENTS (HISTORY)
-- ============================================================

CREATE TABLE stock_movements (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id INT UNSIGNED NOT NULL,
  movement_type ENUM('in', 'out', 'adjustment') NOT NULL,
  quantity DECIMAL(12, 3) NOT NULL,
  reference_type ENUM('purchase', 'sale', 'adjustment', 'return') NOT NULL,
  reference_id INT UNSIGNED DEFAULT NULL,
  purchase_price DECIMAL(12, 2) DEFAULT NULL,
  selling_price DECIMAL(12, 2) DEFAULT NULL,
  balance_after DECIMAL(12, 3) NOT NULL,
  remarks TEXT DEFAULT NULL,
  created_by INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_stock_movements_product_id (product_id),
  KEY idx_stock_movements_movement_type (movement_type),
  KEY idx_stock_movements_reference (reference_type, reference_id),
  KEY idx_stock_movements_created_at (created_at),
  KEY idx_stock_movements_created_by (created_by),
  CONSTRAINT fk_stock_movements_product_id FOREIGN KEY (product_id) REFERENCES products (id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_stock_movements_created_by FOREIGN KEY (created_by) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- SETTINGS, ACTIVITY LOGS, NOTIFICATIONS
-- ============================================================

CREATE TABLE settings (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  setting_key VARCHAR(100) NOT NULL,
  setting_value TEXT DEFAULT NULL,
  description VARCHAR(255) DEFAULT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_settings_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE activity_logs (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED DEFAULT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) DEFAULT NULL,
  entity_id INT UNSIGNED DEFAULT NULL,
  details JSON DEFAULT NULL,
  ip_address VARCHAR(45) DEFAULT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_activity_logs_user_id (user_id),
  KEY idx_activity_logs_entity (entity_type, entity_id),
  KEY idx_activity_logs_created_at (created_at),
  CONSTRAINT fk_activity_logs_user_id FOREIGN KEY (user_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE notifications (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  title VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('info', 'warning', 'success', 'error', 'low_stock', 'payment') NOT NULL DEFAULT 'info',
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notifications_user_id (user_id),
  KEY idx_notifications_is_read (is_read),
  KEY idx_notifications_created_at (created_at),
  CONSTRAINT fk_notifications_user_id FOREIGN KEY (user_id) REFERENCES users (id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE whatsapp_messages (
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

SET FOREIGN_KEY_CHECKS = 1;
