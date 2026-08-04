import { findSaleById, findSaleItems, findSalePayments, formatSale } from '../repositories/sale.repository.js';
import {
  getWhatsAppSettings,
  updateSetting,
  getCompanySettings,
} from '../repositories/settings.repository.js';
import {
  createWhatsAppMessage,
  updateWhatsAppMessageStatus,
  findWhatsAppMessages,
  getWhatsAppMessageStats,
} from '../repositories/whatsapp.repository.js';
import { logActivity } from '../repositories/activityLog.repository.js';
import { buildInvoicePdf } from '../helpers/invoicePdf.helper.js';
import {
  normalizePhoneNumber,
  buildWhatsAppLink,
  uploadWhatsAppMedia,
  sendWhatsAppDocument,
  sendWhatsAppText,
  verifyWhatsAppConnection,
} from '../helpers/whatsapp.helper.js';
import { AppError } from '../utils/apiResponse.js';

const maskToken = (token) => {
  if (!token) return '';
  if (token.length <= 8) return '********';
  return `${token.slice(0, 4)}${'*'.repeat(Math.min(token.length - 8, 20))}${token.slice(-4)}`;
};

const buildInvoiceCaption = (sale, company) => {
  return `Dear ${sale.customerName || 'Customer'},\n\nThank you for your purchase from ${company.company_name || 'Cattle Feed ERP'}.\n\nInvoice: ${sale.invoiceNumber}\nTotal: ₹${Number(sale.totalAmount).toFixed(2)}\nPaid: ₹${Number(sale.paidAmount).toFixed(2)}${sale.pendingAmount > 0 ? `\nPending: ₹${Number(sale.pendingAmount).toFixed(2)}` : ''}\n\nPlease find your invoice attached.`;
};

const loadSaleWithDetails = async (saleId) => {
  const saleRow = await findSaleById(saleId);
  if (!saleRow) return null;

  const [items, payments] = await Promise.all([
    findSaleItems(saleId),
    findSalePayments(saleId),
  ]);

  return formatSale(saleRow, items, payments);
};

const buildReminderMessage = (saleRow, company) => {
  const dueText = saleRow.due_date
    ? ` Due date: ${new Date(saleRow.due_date).toLocaleDateString('en-IN')}.`
    : '';

  return `Dear ${saleRow.customer_name},\n\nThis is a reminder from ${company.company_name || 'Cattle Feed ERP'} regarding invoice ${saleRow.invoice_number}.\n\nTotal: ₹${Number(saleRow.total_amount).toFixed(2)}\nPaid: ₹${Number(saleRow.paid_amount).toFixed(2)}\nPending: ₹${Number(saleRow.pending_amount).toFixed(2)}.${dueText}\n\nPlease arrange payment at your earliest convenience. Thank you.`;
};

export class WhatsAppService {
  async getConfig() {
    const settings = await getWhatsAppSettings();
    const stats = await getWhatsAppMessageStats();

    return {
      enabled: settings.enabled,
      autoSendInvoice: settings.autoSendInvoice,
      phoneNumberId: settings.phoneNumberId,
      apiTokenMasked: maskToken(settings.apiToken),
      hasApiToken: Boolean(settings.apiToken),
      configured: Boolean(settings.apiToken && settings.phoneNumberId),
      stats,
    };
  }

  async updateConfig(data) {
    if (data.enabled !== undefined) {
      await updateSetting('whatsapp_enabled', data.enabled ? 'true' : 'false');
    }
    if (data.autoSendInvoice !== undefined) {
      await updateSetting('whatsapp_auto_send_invoice', data.autoSendInvoice ? 'true' : 'false');
    }
    if (data.apiToken !== undefined && data.apiToken.trim()) {
      await updateSetting('whatsapp_api_token', data.apiToken.trim());
    }
    if (data.phoneNumberId !== undefined) {
      await updateSetting('whatsapp_phone_number_id', data.phoneNumberId.trim());
    }

    return this.getConfig();
  }

  async testConnection() {
    const config = await getWhatsAppSettings();
    if (!config.apiToken || !config.phoneNumberId) {
      throw new AppError('WhatsApp API token and phone number ID are required', 400);
    }

    const result = await verifyWhatsAppConnection(config);

    return {
      connected: true,
      displayPhoneNumber: result.displayPhoneNumber,
      verifiedName: result.verifiedName,
    };
  }

  async listMessages(queryParams) {
    const page = Math.max(parseInt(queryParams.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(queryParams.limit, 10) || 15, 1), 100);

    return findWhatsAppMessages({
      page,
      limit,
      messageType: queryParams.messageType || null,
      status: queryParams.status || null,
    });
  }

  async sendInvoice(saleId, currentUser, ipAddress) {
    const saleRow = await findSaleById(saleId);
    if (!saleRow) {
      throw new AppError('Sale not found', 404);
    }

    const phone = normalizePhoneNumber(saleRow.customer_phone);
    if (!phone) {
      throw new AppError('Customer phone number is not available for this sale', 400);
    }

    const config = await getWhatsAppSettings();
    if (!config.enabled) {
      throw new AppError('WhatsApp integration is disabled. Enable it in WhatsApp settings.', 400);
    }
    if (!config.apiToken || !config.phoneNumberId) {
      throw new AppError('WhatsApp Cloud API is not configured', 400);
    }

    const sale = await loadSaleWithDetails(saleId);
    if (!sale) {
      throw new AppError('Sale not found', 404);
    }

    const company = await getCompanySettings();
    const caption = buildInvoiceCaption(sale, company);
    const pdfBuffer = await buildInvoicePdf(sale, company);
    const filename = `${sale.invoiceNumber}.pdf`;

    const logId = await createWhatsAppMessage({
      saleId: sale.id,
      customerId: sale.customerId,
      phone,
      messageType: 'invoice',
      messageBody: caption,
      mediaFilename: filename,
      sentBy: currentUser?.id || null,
      status: 'pending',
    });

    try {
      const mediaId = await uploadWhatsAppMedia(
        pdfBuffer,
        filename,
        'application/pdf',
        config
      );

      const messageId = await sendWhatsAppDocument(
        phone,
        mediaId,
        filename,
        caption,
        config
      );

      await updateWhatsAppMessageStatus(logId, 'sent', messageId);

      await logActivity({
        userId: currentUser?.id,
        action: 'whatsapp_invoice_sent',
        entityType: 'sale',
        entityId: saleId,
        details: { invoiceNumber: sale.invoiceNumber, phone, messageId },
        ipAddress,
      });

      return {
        sent: true,
        messageId,
        phone,
        invoiceNumber: sale.invoiceNumber,
      };
    } catch (error) {
      await updateWhatsAppMessageStatus(logId, 'failed', null, error.message);
      throw new AppError(error.message, 502);
    }
  }

  async sendPaymentReminder(saleId, currentUser, ipAddress) {
    const saleRow = await findSaleById(saleId);
    if (!saleRow) {
      throw new AppError('Sale not found', 404);
    }
    if (Number(saleRow.pending_amount) <= 0) {
      throw new AppError('This invoice has no pending amount', 400);
    }

    const company = await getCompanySettings();
    const message = buildReminderMessage(saleRow, company);
    const phone = normalizePhoneNumber(saleRow.customer_phone);

    if (!phone) {
      return {
        sent: false,
        method: 'link',
        whatsappUrl: null,
        message,
        reason: 'Customer phone number is not available',
      };
    }

    const config = await getWhatsAppSettings();
    if (!config.enabled || !config.apiToken || !config.phoneNumberId) {
      return {
        sent: false,
        method: 'link',
        whatsappUrl: buildWhatsAppLink(saleRow.customer_phone, message),
        message,
        reason: 'WhatsApp Cloud API not configured — use manual link',
      };
    }

    const logId = await createWhatsAppMessage({
      saleId: Number(saleId),
      customerId: saleRow.customer_id,
      phone,
      messageType: 'reminder',
      messageBody: message,
      sentBy: currentUser?.id || null,
      status: 'pending',
    });

    try {
      const messageId = await sendWhatsAppText(phone, message, config);
      await updateWhatsAppMessageStatus(logId, 'sent', messageId);

      await logActivity({
        userId: currentUser?.id,
        action: 'whatsapp_reminder_sent',
        entityType: 'sale',
        entityId: saleId,
        details: { invoiceNumber: saleRow.invoice_number, phone, messageId },
        ipAddress,
      });

      return {
        sent: true,
        method: 'api',
        messageId,
        phone,
        message,
      };
    } catch (error) {
      await updateWhatsAppMessageStatus(logId, 'failed', null, error.message);
      throw new AppError(error.message, 502);
    }
  }

  async getReminderLink(saleId) {
    const saleRow = await findSaleById(saleId);
    if (!saleRow) {
      throw new AppError('Sale not found', 404);
    }
    if (Number(saleRow.pending_amount) <= 0) {
      throw new AppError('This invoice has no pending amount', 400);
    }

    const company = await getCompanySettings();
    const message = buildReminderMessage(saleRow, company);

    return {
      whatsappUrl: buildWhatsAppLink(saleRow.customer_phone, message),
      message,
    };
  }

  async tryAutoSendInvoice(saleId, currentUser, ipAddress) {
    try {
      const config = await getWhatsAppSettings();
      if (!config.enabled || !config.autoSendInvoice || !config.apiToken || !config.phoneNumberId) {
        return {
          sent: false,
          reason: !config.enabled
            ? 'WhatsApp disabled'
            : !config.autoSendInvoice
              ? 'Auto-send disabled'
              : 'WhatsApp API not configured',
        };
      }

      const saleRow = await findSaleById(saleId);
      if (!saleRow?.customer_phone) {
        return { sent: false, reason: 'No customer phone number' };
      }

      const result = await this.sendInvoice(saleId, currentUser, ipAddress);
      return { sent: true, ...result };
    } catch (error) {
      return { sent: false, reason: error.message };
    }
  }
}

export default new WhatsAppService();
