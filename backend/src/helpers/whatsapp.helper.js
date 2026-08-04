const DEFAULT_API_VERSION = 'v21.0';

export const normalizePhoneNumber = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 10) return `91${digits}`;
  return digits;
};

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
