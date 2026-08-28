export const INFLOW_TYPES = ['cash_in', 'income'];
export const OUTFLOW_TYPES = ['cash_out', 'expense', 'transfer'];
export const MANUAL_REFERENCE_TYPES = ['manual'];
export const CASH_BOOK_MODES = ['cash', 'upi', 'bank', 'other'];

export const JAMA_CATEGORIES = [
  'Sale Payment',
  'Customer Payment',
  'Other Income',
  'Advance Received',
  'Owner Investment',
  'Owner Capital',
  'Loan Received',
  'Refund',
  'Miscellaneous',
];

export const KARCHULU_CATEGORIES = [
  'Supplier Payment',
  'Transport',
  'Loading',
  'Unloading',
  'Electricity',
  'Rent',
  'Salary',
  'Vehicle Expenses',
  'Repairs',
  'Maintenance',
  'Office Expenses',
  'Telephone/Internet',
  'Fuel',
  'Purchase',
  'Other',
];

export const emptyModeBalances = () => ({ cash: 0, upi: 0, bank: 0, other: 0 });

export const normalizeCashBookMode = (method) => {
  if (!method || method === 'credit') return null;
  if (method === 'card') return 'other';
  if (CASH_BOOK_MODES.includes(method)) return method;
  return 'other';
};

export const applyModeDelta = (modes, method, signedAmount) => {
  const mode = normalizeCashBookMode(method);
  if (!mode) return modes;
  return { ...modes, [mode]: Number(modes[mode] || 0) + Number(signedAmount) };
};

export const sourceLabel = (source) => {
  if (source === 'billing') return 'BILLING';
  if (source === 'supplier_payment') return 'SUPPLIER_PAYMENT';
  if (source === 'manual') return 'MANUAL';
  return 'OTHER';
};

export const isInflowType = (type) => INFLOW_TYPES.includes(type);
export const isOutflowType = (type) => OUTFLOW_TYPES.includes(type);

export const bookSideOf = (type) => (isInflowType(type) ? 'jama' : 'karchulu');

export const toSqlDate = (value = new Date()) => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const addDays = (sqlDate, days) => {
  const date = new Date(`${sqlDate}T00:00:00`);
  date.setDate(date.getDate() + days);
  return toSqlDate(date);
};

export const resolvePeriodRange = (period, dateFrom, dateTo, now = new Date()) => {
  if (dateFrom && dateTo) {
    return {
      periodStart: toSqlDate(dateFrom),
      periodEnd: toSqlDate(dateTo),
      period: 'custom',
    };
  }

  const today = toSqlDate(now);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  switch (period) {
    case 'daily':
      return { periodStart: today, periodEnd: today, period: 'daily' };
    case 'yesterday': {
      const yesterday = addDays(today, -1);
      return { periodStart: yesterday, periodEnd: yesterday, period: 'yesterday' };
    }
    case 'weekly': {
      const day = now.getDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;
      const weekStart = addDays(today, mondayOffset);
      return { periodStart: weekStart, periodEnd: today, period: 'weekly' };
    }
    case 'monthly':
      return {
        periodStart: `${year}-${month}-01`,
        periodEnd: today,
        period: 'monthly',
      };
    case 'last_month': {
      const lastDayPrev = addDays(`${year}-${month}-01`, -1);
      const prevMonth = lastDayPrev.slice(5, 7);
      const prevYear = lastDayPrev.slice(0, 4);
      return {
        periodStart: `${prevYear}-${prevMonth}-01`,
        periodEnd: lastDayPrev,
        period: 'last_month',
      };
    }
    case 'yearly':
      return {
        periodStart: `${year}-01-01`,
        periodEnd: today,
        period: 'yearly',
      };
    default:
      return { periodStart: null, periodEnd: null, period: period || 'all' };
  }
};

export const computeClosing = (openingBalance, totalJama, totalKarchulu) =>
  Number(openingBalance || 0) + Number(totalJama || 0) - Number(totalKarchulu || 0);
