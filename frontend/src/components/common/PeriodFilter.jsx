const DEFAULT_OPTIONS = [
  { value: '', label: 'All Time' },
  { value: 'daily', label: 'Today' },
  { value: 'monthly', label: 'This Month' },
  { value: 'yearly', label: 'This Year' },
  { value: 'custom', label: 'Custom Range' },
];

const PeriodFilter = ({
  period,
  onPeriodChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  options = DEFAULT_OPTIONS,
  className = '',
  selectClassName = 'rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500',
}) => (
  <div className={`flex flex-wrap items-center gap-2 ${className}`}>
    <select
      value={period}
      onChange={(e) => onPeriodChange(e.target.value)}
      className={selectClassName}
    >
      {options.map((opt) => (
        <option key={opt.value || 'all'} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>

    {period === 'custom' && (
      <>
        <input
          type="date"
          value={dateFrom}
          max={dateTo || undefined}
          onChange={(e) => onDateFromChange(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
          aria-label="From date"
        />
        <span className="text-xs text-slate-400">to</span>
        <input
          type="date"
          value={dateTo}
          min={dateFrom || undefined}
          onChange={(e) => onDateToChange(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
          aria-label="To date"
        />
      </>
    )}
  </div>
);

export default PeriodFilter;
