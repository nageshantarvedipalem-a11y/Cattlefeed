import { useTranslation } from 'react-i18next';

const PeriodFilter = ({
  period,
  onPeriodChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  options,
  className = '',
  selectClassName = 'rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500',
}) => {
  const { t } = useTranslation();

  const defaultOptions = [
    { value: '', label: t('common.allTime') },
    { value: 'daily', label: t('common.today') },
    { value: 'monthly', label: t('common.thisMonth') },
    { value: 'custom', label: t('common.customRange') },
  ];

  const resolved = options || defaultOptions;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <select
        value={period}
        onChange={(e) => onPeriodChange(e.target.value)}
        className={selectClassName}
      >
        {resolved.map((opt) => (
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
            aria-label={t('common.from')}
          />
          <span className="text-xs text-slate-400">{t('common.to')}</span>
          <input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(e) => onDateToChange(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
            aria-label={t('common.to')}
          />
        </>
      )}
    </div>
  );
};

export default PeriodFilter;
