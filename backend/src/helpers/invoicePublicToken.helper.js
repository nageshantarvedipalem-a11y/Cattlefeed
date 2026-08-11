import crypto from 'crypto';

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

const getSecret = () => process.env.INVOICE_PUBLIC_SECRET || process.env.JWT_SECRET || '';

export const createInvoicePublicToken = (saleId) => {
  const secret = getSecret();
  if (!secret) {
    throw new Error('Invoice public access is not configured (missing JWT_SECRET)');
  }

  const expiry = Date.now() + TOKEN_TTL_MS;
  const payload = `${saleId}.${expiry}`;
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return `${expiry}.${signature}`;
};

export const verifyInvoicePublicToken = (saleId, token) => {
  const secret = getSecret();
  if (!secret || !token) return false;

  const [expiryStr, signature] = String(token).split('.');
  if (!expiryStr || !signature) return false;

  const expiry = Number(expiryStr);
  if (!Number.isFinite(expiry) || Date.now() > expiry) return false;

  const payload = `${saleId}.${expiry}`;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  if (signature.length !== expected.length) return false;

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
};

export const assertPublicInvoicePdfReachable = async (pdfUrl) => {
  let response;
  try {
    response = await fetch(pdfUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AiSensyMediaBot/1.0)',
        Accept: 'application/pdf,*/*',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(25000),
    });
  } catch (error) {
    throw new Error(
      `Invoice PDF URL is not reachable (${error.message}). Set APP_PUBLIC_URL on the backend to your live API domain.`
    );
  }

  if (!response.ok) {
    throw new Error(
      `Invoice PDF URL returned HTTP ${response.status}. AiSensy cannot download the invoice attachment.`
    );
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 100 || buffer.slice(0, 4).toString() !== '%PDF') {
    throw new Error(
      'Invoice PDF URL did not return a valid PDF. AiSensy cannot send the WhatsApp invoice.'
    );
  }

  return buffer.length;
};
