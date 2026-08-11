import { query } from '../../config/database.js';

export const getSetting = async (key) => {
  const rows = await query(
    'SELECT setting_value FROM settings WHERE setting_key = ? LIMIT 1',
    [key]
  );
  return rows[0]?.setting_value ?? null;
};

export const incrementSetting = async (connection, key) => {
  await connection.execute(
    `UPDATE settings
     SET setting_value = CAST(setting_value AS UNSIGNED) + 1
     WHERE setting_key = ?`,
    [key]
  );
};

export const getNextPurchaseNumber = async (connection) => {
  const prefix = (await getSetting('purchase_prefix')) || 'PUR';
  const nextNumber = parseInt((await getSetting('purchase_next_number')) || '1', 10);
  const invoiceNumber = `${prefix}-${String(nextNumber).padStart(5, '0')}`;
  await incrementSetting(connection, 'purchase_next_number');
  return invoiceNumber;
};

export const getNextInvoiceNumber = async (connection) => {
  const prefix = (await getSetting('invoice_prefix')) || 'INV';
  const nextNumber = parseInt((await getSetting('invoice_next_number')) || '1', 10);
  const invoiceNumber = `${prefix}-${String(nextNumber).padStart(5, '0')}`;
  await incrementSetting(connection, 'invoice_next_number');
  return invoiceNumber;
};

export const getCompanySettings = async () => {
  const keys = ['company_name', 'company_address', 'company_phone', 'company_gst', 'currency_symbol'];
  const rows = await query(
    `SELECT setting_key, setting_value FROM settings WHERE setting_key IN (${keys.map(() => '?').join(',')})`,
    keys
  );
  const settings = {};
  rows.forEach((row) => {
    settings[row.setting_key] = row.setting_value;
  });
  return settings;
};

export const updateSetting = async (key, value) => {
  await query(
    `INSERT INTO settings (setting_key, setting_value)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
    [key, value]
  );
};

export const getSettingsByKeys = async (keys) => {
  if (!keys.length) return {};
  const rows = await query(
    `SELECT setting_key, setting_value FROM settings WHERE setting_key IN (${keys.map(() => '?').join(',')})`,
    keys
  );
  const settings = {};
  rows.forEach((row) => {
    settings[row.setting_key] = row.setting_value;
  });
  return settings;
};

export const getWhatsAppSettings = async () => {
  const keys = [
    'whatsapp_enabled',
    'whatsapp_provider',
    'whatsapp_api_token',
    'whatsapp_phone_number_id',
    'whatsapp_auto_send_invoice',
    'whatsapp_aisensy_api_key',
    'whatsapp_aisensy_invoice_campaign',
    'whatsapp_aisensy_reminder_campaign',
  ];
  const dbSettings = await getSettingsByKeys(keys);

  const apiToken = dbSettings.whatsapp_api_token || process.env.WHATSAPP_API_TOKEN || '';
  const phoneNumberId = dbSettings.whatsapp_phone_number_id || process.env.WHATSAPP_PHONE_NUMBER_ID || '';
  const aisensyApiKey = dbSettings.whatsapp_aisensy_api_key || process.env.AISENSY_API_KEY || '';
  const provider = dbSettings.whatsapp_provider || process.env.WHATSAPP_PROVIDER || 'meta';

  return {
    enabled: dbSettings.whatsapp_enabled === 'true',
    provider: provider === 'aisensy' ? 'aisensy' : 'meta',
    apiToken,
    phoneNumberId,
    autoSendInvoice: dbSettings.whatsapp_auto_send_invoice !== 'false',
    apiVersion: process.env.WHATSAPP_API_VERSION || 'v21.0',
    aisensyApiKey,
    aisensyInvoiceCampaign:
      dbSettings.whatsapp_aisensy_invoice_campaign || process.env.AISENSY_INVOICE_CAMPAIGN || '',
    aisensyReminderCampaign:
      dbSettings.whatsapp_aisensy_reminder_campaign || process.env.AISENSY_REMINDER_CAMPAIGN || '',
    publicAppUrl: (process.env.APP_PUBLIC_URL || '').replace(/\/$/, ''),
  };
};
