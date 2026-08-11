import { normalizeIndianMobile } from '../utils/phoneValidation.js';

const DEFAULT_API_VERSION = 'v21.0';

export const normalizePhoneNumber = (phone) => normalizeIndianMobile(phone);

export const buildWhatsAppLink = (phone, message) => {
  const normalized = normalizePhoneNumber(phone);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
};

const getApiBaseUrl = (config) => {
  const version = config.apiVersion || process.env.WHATSAPP_API_VERSION || DEFAULT_API_VERSION;
  return `https://graph.facebook.com/${version}`;
};

const getAuthHeaders = (config) => ({
  Authorization: `Bearer ${config.apiToken}`,
});

export const uploadWhatsAppMedia = async (buffer, filename, mimeType, config) => {
  const formData = new FormData();
  formData.append('messaging_product', 'whatsapp');
  formData.append('file', new Blob([buffer], { type: mimeType }), filename);
  formData.append('type', mimeType);

  const response = await fetch(
    `${getApiBaseUrl(config)}/${config.phoneNumberId}/media`,
    {
      method: 'POST',
      headers: getAuthHeaders(config),
      body: formData,
    }
  );

  const data = await response.json();
  if (!response.ok) {
    const errorMessage = data?.error?.message || 'Failed to upload media to WhatsApp';
    throw new Error(errorMessage);
  }

  return data.id;
};

export const sendWhatsAppText = async (to, text, config) => {
  const response = await fetch(
    `${getApiBaseUrl(config)}/${config.phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        ...getAuthHeaders(config),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { body: text },
      }),
    }
  );

  const data = await response.json();
  if (!response.ok) {
    const errorMessage = data?.error?.message || 'Failed to send WhatsApp text message';
    throw new Error(errorMessage);
  }

  return data.messages?.[0]?.id || null;
};

export const sendWhatsAppDocument = async (to, mediaId, filename, caption, config) => {
  const response = await fetch(
    `${getApiBaseUrl(config)}/${config.phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        ...getAuthHeaders(config),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'document',
        document: {
          id: mediaId,
          filename,
          caption: caption || undefined,
        },
      }),
    }
  );

  const data = await response.json();
  if (!response.ok) {
    const errorMessage = data?.error?.message || 'Failed to send WhatsApp document';
    throw new Error(errorMessage);
  }

  return data.messages?.[0]?.id || null;
};

export const verifyWhatsAppConnection = async (config) => {
  const response = await fetch(
    `${getApiBaseUrl(config)}/${config.phoneNumberId}`,
    {
      method: 'GET',
      headers: getAuthHeaders(config),
    }
  );

  const data = await response.json();
  if (!response.ok) {
    const errorMessage = data?.error?.message || 'WhatsApp API connection failed';
    throw new Error(errorMessage);
  }

  return {
    id: data.id,
    displayPhoneNumber: data.display_phone_number || null,
    verifiedName: data.verified_name || null,
  };
};

const AISENSY_API_URL = process.env.AISENSY_API_URL || 'https://backend.aisensy.com/campaign/t1/api/v2';

export const formatAiSensyDestination = (phone) => {
  const normalized = normalizePhoneNumber(phone);
  if (!normalized) return null;
  return normalized.startsWith('+') ? normalized : `+${normalized}`;
};

export const formatAiSensyAmount = (amount) => Number(amount || 0).toFixed(2);

export const buildAiSensyInvoiceTemplateParams = (sale) => [
  sale.customerName || 'Customer',
  sale.invoiceNumber,
  formatAiSensyAmount(sale.totalAmount),
  formatAiSensyAmount(sale.paidAmount),
  formatAiSensyAmount(sale.pendingAmount),
];

export const sendAiSensyCampaign = async ({
  apiKey,
  campaignName,
  destination,
  userName,
  source = 'Cattle Feed ERP',
  media = null,
  templateParams = [],
  tags = [],
  attributes = null,
}) => {
  const payload = {
    apiKey,
    campaignName,
    destination,
    userName,
    source,
  };

  if (media?.url && media?.filename) {
    payload.media = media;
  }
  if (templateParams.length) {
    payload.templateParams = templateParams;
  }
  if (tags.length) {
    payload.tags = tags;
  }
  if (attributes && Object.keys(attributes).length) {
    payload.attributes = attributes;
  }

  const response = await fetch(AISENSY_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const errorMessage =
      data?.message ||
      data?.error ||
      data?.errorMessage ||
      `AiSensy campaign request failed (${response.status})`;
    throw new Error(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
  }

  return {
    success: true,
    status: response.status,
    data,
  };
};

export const verifyAiSensyConnection = async (config) => {
  if (!config.aisensyApiKey || !config.aisensyInvoiceCampaign) {
    throw new Error('AiSensy API key and invoice campaign name are required');
  }
  if (!config.publicAppUrl) {
    throw new Error('APP_PUBLIC_URL is not set on the server (required for invoice PDF links)');
  }

  return {
    provider: 'aisensy',
    campaignName: config.aisensyInvoiceCampaign,
    publicAppUrl: config.publicAppUrl,
  };
};
