import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config();

const ADMIN_USERNAME = 'admin';
const ADMIN_EMAIL = process.env.DEFAULT_ADMIN_EMAIL || 'admin@cattlefeed.com';

const DEFAULT_SETTINGS = [
  ['company_name', 'Cattle Feed ERP', 'Business name displayed on invoices and reports'],
  ['company_address', '', 'Business address for invoices'],
  ['company_phone', '', 'Business contact phone'],
  ['company_gst', '', 'Business GST number'],
  ['invoice_prefix', 'INV', 'Invoice number prefix'],
  ['invoice_next_number', '1', 'Next invoice sequence number'],
  ['purchase_prefix', 'PUR', 'Purchase number prefix'],
  ['purchase_next_number', '1', 'Next purchase sequence number'],
  ['currency_symbol', '₹', 'Currency symbol'],
  ['low_stock_alert_enabled', 'true', 'Enable low stock notifications'],
  ['whatsapp_enabled', 'false', 'Enable WhatsApp invoice sending'],
  ['whatsapp_api_token', '', 'WhatsApp Cloud API token'],
  ['whatsapp_phone_number_id', '', 'WhatsApp Business phone number ID'],
  ['whatsapp_auto_send_invoice', 'true', 'Auto-send invoice PDF via WhatsApp after billing'],
  ['session_expiry_hours', '24', 'JWT session expiry in hours'],
  ['timezone', 'Asia/Kolkata', 'Application timezone'],
];

const TABLES_TO_TRUNCATE = [
  'whatsapp_messages',
  'notifications',
  'activity_logs',
  'password_reset_tokens',
  'stock_movements',
  'expenses',
  'cash_book',
  'customer_ledger',
  'payments',
  'sale_payments',
  'sale_items',
  'sales',
  'purchase_items',
  'purchases',
  'customers',
  'suppliers',
  'products',
  'brands',
  'categories',
];

const getConnection = async () =>
  mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'cattle_feed_erp',
    multipleStatements: true,
  });

const run = async () => {
  const connection = await getConnection();

  try {
    console.log('Clearing test data (keeping admin user and roles)...');

    const [adminRows] = await connection.query(
      `SELECT id, role_id, username, email, password_hash, full_name, phone, is_active
       FROM users
       WHERE username = ? OR email = ?
       LIMIT 1`,
      [ADMIN_USERNAME, ADMIN_EMAIL],
    );

    if (!adminRows.length) {
      throw new Error(
        `Admin user not found (username: ${ADMIN_USERNAME}, email: ${ADMIN_EMAIL}). Run db:seed first.`,
      );
    }

    const admin = adminRows[0];
    console.log(`✓ Preserving admin user: ${admin.username} (${admin.email})`);

    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    for (const table of TABLES_TO_TRUNCATE) {
      await connection.query(`TRUNCATE TABLE \`${table}\``);
      console.log(`✓ Cleared ${table}`);
    }

    await connection.query('DELETE FROM settings');
    for (const [key, value, description] of DEFAULT_SETTINGS) {
      await connection.query(
        'INSERT INTO settings (setting_key, setting_value, description) VALUES (?, ?, ?)',
        [key, value, description],
      );
    }
    console.log('✓ Reset settings to defaults');

    await connection.query('DELETE FROM users WHERE id <> ?', [admin.id]);
    await connection.query(
      `UPDATE users
       SET role_id = ?, username = ?, email = ?, password_hash = ?, full_name = ?, phone = ?, is_active = 1, last_login_at = NULL
       WHERE id = ?`,
      [
        admin.role_id,
        admin.username,
        admin.email,
        admin.password_hash,
        admin.full_name,
        admin.phone,
        admin.id,
      ],
    );
    console.log('✓ Removed extra users; kept admin login');

    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    const counts = {};
    for (const table of [...TABLES_TO_TRUNCATE, 'settings', 'users', 'roles']) {
      const [rows] = await connection.query(`SELECT COUNT(*) AS count FROM \`${table}\``);
      counts[table] = rows[0].count;
    }

    console.log('\nTable row counts after cleanup:');
    Object.entries(counts).forEach(([table, count]) => {
      console.log(`  ${table}: ${count}`);
    });

    console.log('\nTest data cleared successfully. Database is ready for client handover.');
    process.exit(0);
  } catch (error) {
    console.error('\nClear data failed:', error.message || error);

    if (error.code === 'ECONNREFUSED') {
      console.error('\nCannot connect to MySQL. Check backend/.env (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME).');
    }

    process.exit(1);
  } finally {
    await connection.end();
  }
};

run();
