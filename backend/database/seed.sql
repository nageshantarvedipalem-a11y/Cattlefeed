-- ============================================================
-- Cattle Feed ERP - Seed Data (Phase 1)
-- Default roles, admin user, and application settings
-- Default admin password: Admin@123 (CHANGE IMMEDIATELY IN PRODUCTION)
-- ============================================================

USE cattle_feed_erp;

-- Default Roles with Permissions
INSERT INTO roles (name, permissions) VALUES
('owner', JSON_OBJECT(
  'dashboard', true,
  'users', JSON_OBJECT('view', true, 'create', true, 'edit', true, 'delete', true),
  'customers', JSON_OBJECT('view', true, 'create', true, 'edit', true, 'delete', true),
  'suppliers', JSON_OBJECT('view', true, 'create', true, 'edit', true, 'delete', true),
  'products', JSON_OBJECT('view', true, 'create', true, 'edit', true, 'delete', true),
  'stock', JSON_OBJECT('view', true, 'create', true, 'edit', true, 'delete', true),
  'billing', JSON_OBJECT('view', true, 'create', true, 'edit', true, 'delete', true),
  'ledger', JSON_OBJECT('view', true, 'create', true, 'edit', true, 'delete', true),
  'cashbook', JSON_OBJECT('view', true, 'create', true, 'edit', true, 'delete', true),
  'payments', JSON_OBJECT('view', true, 'create', true, 'edit', true, 'delete', true),
  'reports', JSON_OBJECT('view', true, 'export', true),
  'settings', JSON_OBJECT('view', true, 'edit', true)
)),
('manager', JSON_OBJECT(
  'dashboard', true,
  'users', JSON_OBJECT('view', true, 'create', false, 'edit', true, 'delete', false),
  'customers', JSON_OBJECT('view', true, 'create', true, 'edit', true, 'delete', false),
  'suppliers', JSON_OBJECT('view', true, 'create', true, 'edit', true, 'delete', false),
  'products', JSON_OBJECT('view', true, 'create', true, 'edit', true, 'delete', false),
  'stock', JSON_OBJECT('view', true, 'create', true, 'edit', true, 'delete', false),
  'billing', JSON_OBJECT('view', true, 'create', true, 'edit', true, 'delete', false),
  'ledger', JSON_OBJECT('view', true, 'create', true, 'edit', false, 'delete', false),
  'cashbook', JSON_OBJECT('view', true, 'create', true, 'edit', true, 'delete', false),
  'payments', JSON_OBJECT('view', true, 'create', true, 'edit', true, 'delete', false),
  'reports', JSON_OBJECT('view', true, 'export', true),
  'settings', JSON_OBJECT('view', true, 'edit', false)
)),
('cashier', JSON_OBJECT(
  'dashboard', true,
  'users', JSON_OBJECT('view', false, 'create', false, 'edit', false, 'delete', false),
  'customers', JSON_OBJECT('view', true, 'create', true, 'edit', false, 'delete', false),
  'suppliers', JSON_OBJECT('view', false, 'create', false, 'edit', false, 'delete', false),
  'products', JSON_OBJECT('view', true, 'create', false, 'edit', false, 'delete', false),
  'stock', JSON_OBJECT('view', true, 'create', false, 'edit', false, 'delete', false),
  'billing', JSON_OBJECT('view', true, 'create', true, 'edit', false, 'delete', false),
  'ledger', JSON_OBJECT('view', true, 'create', false, 'edit', false, 'delete', false),
  'cashbook', JSON_OBJECT('view', false, 'create', false, 'edit', false, 'delete', false),
  'payments', JSON_OBJECT('view', true, 'create', true, 'edit', false, 'delete', false),
  'reports', JSON_OBJECT('view', false, 'export', false),
  'settings', JSON_OBJECT('view', false, 'edit', false)
));

-- Default Admin User (password: Admin@123)
-- bcrypt hash generated with cost factor 12
INSERT INTO users (role_id, username, email, password_hash, full_name, phone, is_active)
VALUES (
  1,
  'admin',
  'admin@cattlefeed.com',
  '$2b$12$bkfLvtWdcEKTM6LBG.U8tOYwxwzxmD/Q74I.DKWdEOJt9s1B27bGK',
  'System Administrator',
  '9999999999',
  1
);

-- Application Settings
INSERT INTO settings (setting_key, setting_value, description) VALUES
('company_name', 'Cattle Feed ERP', 'Business name displayed on invoices and reports'),
('company_address', '', 'Business address for invoices'),
('company_phone', '', 'Business contact phone'),
('company_gst', '', 'Business GST number'),
('invoice_prefix', 'INV', 'Invoice number prefix'),
('invoice_next_number', '1', 'Next invoice sequence number'),
('purchase_prefix', 'PUR', 'Purchase number prefix'),
('purchase_next_number', '1', 'Next purchase sequence number'),
('currency_symbol', '₹', 'Currency symbol'),
('low_stock_alert_enabled', 'true', 'Enable low stock notifications'),
('whatsapp_enabled', 'false', 'Enable WhatsApp invoice sending'),
('whatsapp_api_token', '', 'WhatsApp Cloud API token'),
('whatsapp_phone_number_id', '', 'WhatsApp Business phone number ID'),
('whatsapp_auto_send_invoice', 'true', 'Auto-send invoice PDF via WhatsApp after billing'),
('session_expiry_hours', '24', 'JWT session expiry in hours'),
('timezone', 'Asia/Kolkata', 'Application timezone');

-- Default Categories
INSERT INTO categories (name, description) VALUES
('Cattle Feed', 'All types of cattle feed products'),
('Supplements', 'Mineral and vitamin supplements'),
('Accessories', 'Feeding accessories and equipment');

-- Default Brands
INSERT INTO brands (name, description) VALUES
('Generic', 'Generic/unbranded products'),
('Premium', 'Premium quality products');
