const RUPEE_SYMBOLS = new Set(['₹', '\u20B9', 'Rs', 'Rs.', 'INR']);

export const pdfCurrencySymbol = (symbol = '₹') => {
  const normalized = String(symbol || '₹').trim();
  if (RUPEE_SYMBOLS.has(normalized) || normalized.toUpperCase() === 'INR') {
    return 'Rs. ';
  }
  return normalized.endsWith(' ') ? normalized : `${normalized} `;
};

export const formatCurrency = (amount, symbol = '₹') => {
  const value = Number(amount) || 0;
  return `${symbol}${value.toFixed(2)}`;
};

export const formatCurrencyForPdf = (amount, symbol = '₹') => {
  const value = Number(amount) || 0;
  return `${pdfCurrencySymbol(symbol)}${value.toFixed(2)}`;
};
