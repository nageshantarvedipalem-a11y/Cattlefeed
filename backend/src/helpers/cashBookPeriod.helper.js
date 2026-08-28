export const INFLOW_TYPES = ['cash_in', 'income'];
export const OUTFLOW_TYPES = ['cash_out', 'expense', 'transfer'];
export const MANUAL_REFERENCE_TYPES = ['manual', 'opening_balance'];

export const JAMA_CATEGORIES = [
  'Opening Balance',
  'Other Income',
  'Owner Capital',
  'Loan Received',
  'Refund',
];

export const KARCHULU_CATEGORIES = [
  'Electricity',
  'Rent',
  'Salary',
  'Transport',
  'Stationery',
  'Maintenance',
  'Fuel',
  'Purchase',
  'Other',
];

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
