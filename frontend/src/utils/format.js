import i18n from '../i18n';

const locale = () => (i18n.language?.startsWith('te') ? 'te-IN' : 'en-IN');

export const formatCurrency = (amount) => {
  const value = Number(amount) || 0;
  return new Intl.NumberFormat(locale(), {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatQuantity = (quantity, decimals = 3) => {
  const value = Number(quantity) || 0;
  return new Intl.NumberFormat(locale(), {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(value);
};

export const formatStatusLabel = (status) => {
  if (status === 'active') return i18n.t('common.active');
  if (status === 'inactive') return i18n.t('common.inactive');
  if (status === 'discontinued') return i18n.t('common.discontinued');
  return status;
};

export const formatPaymentStatus = (status, paidAmount = 0) => {
  if (status === 'paid') return i18n.t('status.paid').toUpperCase();
  if (status === 'partial') return i18n.t('status.partial').toUpperCase();
  if (status === 'pending' && Number(paidAmount) === 0) return i18n.t('status.pending').toUpperCase();
  return String(status || '').toUpperCase();
};

export const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(locale(), {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};
