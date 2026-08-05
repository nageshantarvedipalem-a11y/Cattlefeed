import billingService from '../services/billingService';

const getApiErrorMessage = (error, fallback) => {
  const blobMessage = error?.response?.data?.message;
  if (typeof blobMessage === 'string') return blobMessage;

  if (error?.response?.data instanceof Blob) {
    return fallback;
  }

  return error?.response?.data?.message || error.message || fallback;
};

export const printInvoicePdf = async (saleId) => {
  let response;
  try {
    response = await billingService.downloadInvoice(saleId, false);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, 'Failed to load invoice PDF'));
  }

  const blob = new Blob([response.data], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);

  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('title', 'Invoice print');
    iframe.style.position = 'fixed';
    iframe.style.left = '-10000px';
    iframe.style.top = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    iframe.src = url;

    const cleanup = () => {
      iframe.remove();
      window.URL.revokeObjectURL(url);
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
  });
};
