import billingService from '../services/billingService';
import { parseApiErrorMessage } from './apiError';

const openPrintWindow = (html) => new Promise((resolve, reject) => {
  const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1200');
  if (!printWindow) {
    reject(new Error('Pop-up blocked. Allow pop-ups to print the invoice.'));
    return;
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  const triggerPrint = () => {
    setTimeout(() => {
      try {
        printWindow.focus();
        printWindow.print();
        resolve();
      } catch (error) {
        printWindow.close();
        reject(new Error('Failed to open print dialog'));
      }
    }, 800);
  };

  if (printWindow.document.readyState === 'complete') {
    triggerPrint();
  } else {
    printWindow.onload = triggerPrint;
  }
});

const fetchInvoiceHtml = async (saleId) => {
  const response = await billingService.downloadInvoice(saleId, 'html');
  return typeof response.data === 'string' ? response.data : response.data.text();
};

export const printInvoicePdf = async (saleId) => {
  try {
    const html = await fetchInvoiceHtml(saleId);
    await openPrintWindow(html);
  } catch (error) {
    const message = await parseApiErrorMessage(error, 'Failed to load invoice');
    throw new Error(message);
  }
};

export const downloadInvoicePdf = async (saleId) => {
  try {
    const html = await fetchInvoiceHtml(saleId);
    await openPrintWindow(html);
  } catch (error) {
    const message = await parseApiErrorMessage(error, 'Failed to download invoice');
    throw new Error(message);
  }
};
