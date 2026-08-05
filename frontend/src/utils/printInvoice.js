import billingService from '../services/billingService';
import { parseApiErrorMessage } from './apiError';

const printHtml = (html) => new Promise((resolve, reject) => {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', 'Invoice print');
  Object.assign(iframe.style, {
    position: 'fixed',
    right: '0',
    bottom: '0',
    width: '0',
    height: '0',
    border: '0',
    visibility: 'hidden',
  });

  let finished = false;
  const finish = (error) => {
    if (finished) return;
    finished = true;
    window.setTimeout(() => iframe.remove(), 1500);
    if (error) reject(error);
    else resolve();
  };

  const triggerPrint = () => {
    window.setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        finish();
      } catch {
        finish(new Error('Failed to open print dialog'));
      }
    }, 400);
  };

  iframe.onload = triggerPrint;
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    iframe.remove();
    reject(new Error('Could not prepare print view'));
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  if (doc.readyState === 'complete') {
    triggerPrint();
  }
});

const fetchInvoiceHtml = async (saleId) => {
  const response = await billingService.downloadInvoice(saleId, 'html');
  const html = typeof response.data === 'string' ? response.data : await response.data.text();
  const trimmed = html.trim();

  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      throw new Error(parsed.message || 'Failed to load invoice');
    } catch (error) {
      if (error instanceof SyntaxError) {
        /* not JSON — continue */
      } else {
        throw error;
      }
    }
  }

  if (!trimmed || !/<html/i.test(trimmed)) {
    throw new Error('Invalid invoice response. Redeploy the backend API on Hostinger.');
  }

  return html;
};

export const printInvoicePdf = async (saleId) => {
  try {
    const html = await fetchInvoiceHtml(saleId);
    await printHtml(html);
  } catch (error) {
    const message = await parseApiErrorMessage(error, 'Failed to load invoice');
    throw new Error(message);
  }
};

export const downloadInvoicePdf = async (saleId) => {
  try {
    const html = await fetchInvoiceHtml(saleId);
    await printHtml(html);
  } catch (error) {
    const message = await parseApiErrorMessage(error, 'Failed to download invoice');
    throw new Error(message);
  }
};
