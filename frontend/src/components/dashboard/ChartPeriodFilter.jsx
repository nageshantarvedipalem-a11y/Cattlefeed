const PERIOD_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'custom', label: 'Custom' },
];

const ChartPeriodFilter = ({
  period,
  onPeriodChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  compact = false,
}) => (
  <div className={`flex flex-wrap items-center ${compact ? 'gap-1.5' : 'gap-2'}`}>
    <div className="inline-flex rounded-lg border border-emerald-100 bg-emerald-50/50 p-0.5">
      {PERIOD_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onPeriodChange(option.value)}
          className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
            period === option.value
              ? 'bg-white text-primary-800 shadow-sm ring-1 ring-emerald-100'
              : 'text-slate-500 hover:text-primary-700'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>

    {period === 'custom' && (
      <div className="flex flex-wrap items-center gap-1.5">
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => onDateFromChange(e.target.value)}
          className="rounded-lg border border-emerald-100 bg-white px-2 py-1 text-[11px] outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-100"
        />
        <span className="text-[10px] text-slate-400">to</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => onDateToChange(e.target.value)}
          className="rounded-lg border border-emerald-100 bg-white px-2 py-1 text-[11px] outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-100"
        />
      </div>
    )}
  </div>
);

export default ChartPeriodFilter;
