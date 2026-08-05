import billingService from '../services/billingService';
import { parseApiErrorMessage } from './apiError';

const printHtmlInIframe = (html) => new Promise((resolve, reject) => {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', 'Invoice print');
  iframe.style.position = 'fixed';
  iframe.style.left = '-10000px';
  iframe.style.top = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';

  const cleanup = () => {
    iframe.remove();
  };

  iframe.onload = () => {
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        resolve();
      } catch (error) {
        cleanup();
        reject(new Error('Failed to open print dialog'));
        return;
      }
      setTimeout(cleanup, 60000);
    }, 600);
  };

  iframe.onerror = () => {
    cleanup();
    reject(new Error('Failed to load invoice for printing'));
  };

  document.body.appendChild(iframe);
  iframe.srcdoc = html;
});

export const printInvoicePdf = async (saleId) => {
  try {
    const response = await billingService.downloadInvoice(saleId, 'html');
    const html = typeof response.data === 'string' ? response.data : await response.data.text();
    await printHtmlInIframe(html);
  } catch (error) {
    const message = await parseApiErrorMessage(error, 'Failed to load invoice');
    throw new Error(message);
  }
};

export const downloadInvoicePdf = async (saleId) => {
  try {
    const response = await billingService.downloadInvoice(saleId, 'html');
    const html = typeof response.data === 'string' ? response.data : await response.data.text();
    await printHtmlInIframe(html);
  } catch (error) {
    const message = await parseApiErrorMessage(error, 'Failed to download invoice');
    throw new Error(message);
  }
};
