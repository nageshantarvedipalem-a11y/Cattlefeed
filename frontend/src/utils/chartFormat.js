const toDateKey = (value) => {
  if (!value) return '';
  const str = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.slice(0, 10);
  return str;
};

export const formatChartLabel = (value, period = 'daily') => {
  if (value == null || value === '') return '';
  const key = toDateKey(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(key)) {
    const d = new Date(`${key}T12:00:00`);
    if (period === 'yearly') return d.getFullYear().toString();
    if (period === 'monthly') {
      return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    }
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  }
  return String(value).length > 12 ? String(value).slice(0, 12) : String(value);
};

export const formatChartCurrency = (value) => {
  const n = Number(value) || 0;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}k`;
  return `₹${n.toFixed(0)}`;
};

export const withDisplayLabels = (data, period = 'daily') =>
  (data || []).map((row) => ({
    ...row,
    displayLabel: formatChartLabel(row.label, period),
  }));

export const fillDailyGaps = (data, valueKeys, days = 7) => {
  const map = new Map(
    (data || []).map((row) => [toDateKey(row.label), row])
  );
  const rows = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const existing = map.get(key);
    const row = { label: key, displayLabel: formatChartLabel(key, 'daily') };
    valueKeys.forEach((k) => {
      row[k] = existing?.[k] ?? 0;
    });
    rows.push(row);
  }
  return rows;
};

export const fillMonthlyGaps = (data, valueKeys, months = 12) => {
  const byLabel = new Map((data || []).map((row) => [String(row.label), row]));
  const rows = [];

  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(1);
    d.setHours(12, 0, 0, 0);
    d.setMonth(d.getMonth() - i);
    const displayLabel = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const existing = byLabel.get(displayLabel);
    const row = { label: displayLabel, displayLabel };
    valueKeys.forEach((k) => {
      row[k] = existing?.[k] ?? 0;
    });
    rows.push(row);
  }

  return rows;
};

export const prepareTimeSeries = (data, period, valueKeys) => {
  const labeled = withDisplayLabels(data, period);
  if (period === 'daily') return fillDailyGaps(labeled, valueKeys, 7);
  if (period === 'monthly') return fillMonthlyGaps(labeled, valueKeys, 12);
  return labeled;
};
