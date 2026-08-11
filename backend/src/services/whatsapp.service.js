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
import { createInvoicePublicToken } from '../helpers/invoicePublicToken.helper.js';
import { getApiPrefix } from '../../config/app.config.js';
import {
  normalizePhoneNumber,
  buildWhatsAppLink,
  uploadWhatsAppMedia,
  sendWhatsAppDocument,
  sendWhatsAppText,
  verifyWhatsAppConnection,
  formatAiSensyDestination,
  buildAiSensyInvoiceTemplateParams,
  sendAiSensyCampaign,
  verifyAiSensyConnection,
} from '../helpers/whatsapp.helper.js';
import { AppError } from '../utils/apiResponse.js';

const maskToken = (token) => {
  if (!token) return '';
  if (token.length <= 8) return '********';
  return `${token.slice(0, 4)}${'*'.repeat(Math.min(token.length - 8, 20))}${token.slice(-4)}`;
};

const isMetaConfigured = (config) => Boolean(config.apiToken && config.phoneNumberId);

const isAiSensyConfigured = (config) =>
  Boolean(config.aisensyApiKey && config.aisensyInvoiceCampaign && config.publicAppUrl);

const isProviderConfigured = (config) =>
  config.provider === 'aisensy' ? isAiSensyConfigured(config) : isMetaConfigured(config);

const buildPublicInvoicePdfUrl = (saleId, config) => {
  const token = createInvoicePublicToken(saleId);
  return `${config.publicAppUrl}${getApiPrefix()}/public/invoices/${saleId}.pdf?token=${encodeURIComponent(token)}`;
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
      provider: settings.provider,
      autoSendInvoice: settings.autoSendInvoice,
      phoneNumberId: settings.phoneNumberId,
      apiTokenMasked: maskToken(settings.apiToken),
      hasApiToken: Boolean(settings.apiToken),
      aisensyInvoiceCampaign: settings.aisensyInvoiceCampaign,
      aisensyReminderCampaign: settings.aisensyReminderCampaign,
      aisensyApiKeyMasked: maskToken(settings.aisensyApiKey),
      hasAisensyApiKey: Boolean(settings.aisensyApiKey),
      publicAppUrl: settings.publicAppUrl,
      configured: isProviderConfigured(settings),
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
    if (data.provider !== undefined) {
      const provider = data.provider === 'aisensy' ? 'aisensy' : 'meta';
      await updateSetting('whatsapp_provider', provider);
    }
    if (data.apiToken !== undefined && data.apiToken.trim()) {
      await updateSetting('whatsapp_api_token', data.apiToken.trim());
    }
    if (data.phoneNumberId !== undefined) {
      await updateSetting('whatsapp_phone_number_id', data.phoneNumberId.trim());
    }
    if (data.aisensyApiKey !== undefined && data.aisensyApiKey.trim()) {
      await updateSetting('whatsapp_aisensy_api_key', data.aisensyApiKey.trim());
    }
    if (data.aisensyInvoiceCampaign !== undefined) {
      await updateSetting('whatsapp_aisensy_invoice_campaign', data.aisensyInvoiceCampaign.trim());
    }
    if (data.aisensyReminderCampaign !== undefined) {
      await updateSetting('whatsapp_aisensy_reminder_campaign', data.aisensyReminderCampaign.trim());
    }

    return this.getConfig();
  }

  async testConnection() {
    const config = await getWhatsAppSettings();

    if (config.provider === 'aisensy') {
      const result = await verifyAiSensyConnection(config);
      return {
        connected: true,
        provider: 'aisensy',
        campaignName: result.campaignName,
        publicAppUrl: result.publicAppUrl,
      };
    }

    if (!config.apiToken || !config.phoneNumberId) {
      throw new AppError('WhatsApp API token and phone number ID are required', 400);
    }

    const result = await verifyWhatsAppConnection(config);

    return {
      connected: true,
      provider: 'meta',
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

  async sendInvoiceViaMeta(sale, phone, filename, pdfBuffer, config, logId, currentUser, ipAddress) {
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
      null,
      config
    );

    await updateWhatsAppMessageStatus(logId, 'sent', messageId);

    await logActivity({
      userId: currentUser?.id,
      action: 'whatsapp_invoice_sent',
      entityType: 'sale',
      entityId: sale.id,
      details: { invoiceNumber: sale.invoiceNumber, phone, messageId, provider: 'meta' },
      ipAddress,
    });

    return {
      sent: true,
      provider: 'meta',
      messageId,
      phone,
      invoiceNumber: sale.invoiceNumber,
    };
  }

  async sendInvoiceViaAiSensy(sale, phone, filename, config, logId, currentUser, ipAddress) {
    const destination = formatAiSensyDestination(phone);
    if (!destination) {
      throw new AppError('Invalid customer WhatsApp number for AiSensy', 400);
    }

    const pdfUrl = buildPublicInvoicePdfUrl(sale.id, config);

    const result = await sendAiSensyCampaign({
      apiKey: config.aisensyApiKey,
      campaignName: config.aisensyInvoiceCampaign,
      destination,
      userName: sale.customerName || 'Customer',
      media: {
        url: pdfUrl,
        filename,
      },
      templateParams: buildAiSensyInvoiceTemplateParams(sale),
    });

    const messageId = result.data?.messageId || result.data?.id || null;
    await updateWhatsAppMessageStatus(logId, 'sent', messageId);

    await logActivity({
      userId: currentUser?.id,
      action: 'whatsapp_invoice_sent',
      entityType: 'sale',
      entityId: sale.id,
      details: {
        invoiceNumber: sale.invoiceNumber,
        phone: destination,
        messageId,
        provider: 'aisensy',
        campaignName: config.aisensyInvoiceCampaign,
      },
      ipAddress,
    });

    return {
      sent: true,
      provider: 'aisensy',
      messageId,
      phone: destination,
      invoiceNumber: sale.invoiceNumber,
    };
  }

  async sendInvoice(saleId, currentUser, ipAddress) {
    const saleRow = await findSaleById(saleId);
    if (!saleRow) {
      throw new AppError('Sale not found', 404);
    }

    const phone = normalizePhoneNumber(saleRow.customer_phone);
    if (!phone) {
      throw new AppError('Invalid customer WhatsApp number. Enter a valid 10-digit Indian mobile number.', 400);
    }

    const config = await getWhatsAppSettings();
    if (!config.enabled) {
      throw new AppError('WhatsApp integration is disabled. Enable it in WhatsApp settings.', 400);
    }
    if (!isProviderConfigured(config)) {
      throw new AppError(
        config.provider === 'aisensy'
          ? 'AiSensy is not configured. Set API key, invoice campaign name, and APP_PUBLIC_URL on the server.'
          : 'WhatsApp Cloud API is not configured',
        400
      );
    }

    const sale = await loadSaleWithDetails(saleId);
    if (!sale) {
      throw new AppError('Sale not found', 404);
    }

    const company = await getCompanySettings();
    const pdfBuffer = await buildInvoicePdf(sale, company);
    const filename = `${sale.invoiceNumber}.pdf`;

    const logId = await createWhatsAppMessage({
      saleId: sale.id,
      customerId: sale.customerId,
      phone,
      messageType: 'invoice',
      messageBody: `[PDF Invoice] ${sale.invoiceNumber}`,
      mediaFilename: filename,
      sentBy: currentUser?.id || null,
      status: 'pending',
    });

    try {
      if (config.provider === 'aisensy') {
        return await this.sendInvoiceViaAiSensy(
          sale,
          phone,
          filename,
          config,
          logId,
          currentUser,
          ipAddress
        );
      }

      return await this.sendInvoiceViaMeta(
        sale,
        phone,
        filename,
        pdfBuffer,
        config,
        logId,
        currentUser,
        ipAddress
      );
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
    if (!config.enabled || !isProviderConfigured(config)) {
      return {
        sent: false,
        method: 'link',
        whatsappUrl: buildWhatsAppLink(saleRow.customer_phone, message),
        message,
        reason: 'WhatsApp API not configured — use manual link',
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
      if (config.provider === 'aisensy' && config.aisensyReminderCampaign) {
        const destination = formatAiSensyDestination(phone);
        const result = await sendAiSensyCampaign({
          apiKey: config.aisensyApiKey,
          campaignName: config.aisensyReminderCampaign,
          destination,
          userName: saleRow.customer_name || 'Customer',
          templateParams: [
            saleRow.customer_name || 'Customer',
            saleRow.invoice_number,
            Number(saleRow.pending_amount).toFixed(2),
          ],
        });

        const messageId = result.data?.messageId || result.data?.id || null;
        await updateWhatsAppMessageStatus(logId, 'sent', messageId);

        await logActivity({
          userId: currentUser?.id,
          action: 'whatsapp_reminder_sent',
          entityType: 'sale',
          entityId: saleId,
          details: {
            invoiceNumber: saleRow.invoice_number,
            phone: destination,
            messageId,
            provider: 'aisensy',
          },
          ipAddress,
        });

        return {
          sent: true,
          method: 'api',
          provider: 'aisensy',
          messageId,
          phone: destination,
          message,
        };
      }

      const messageId = await sendWhatsAppText(phone, message, config);
      await updateWhatsAppMessageStatus(logId, 'sent', messageId);

      await logActivity({
        userId: currentUser?.id,
        action: 'whatsapp_reminder_sent',
        entityType: 'sale',
        entityId: saleId,
        details: { invoiceNumber: saleRow.invoice_number, phone, messageId, provider: 'meta' },
        ipAddress,
      });

      return {
        sent: true,
        method: 'api',
        provider: 'meta',
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
      if (!config.enabled || !config.autoSendInvoice || !isProviderConfigured(config)) {
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
