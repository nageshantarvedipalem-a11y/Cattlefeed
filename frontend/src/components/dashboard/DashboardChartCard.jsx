import ChartPeriodFilter from './ChartPeriodFilter';
import useDashboardChart from '../../hooks/useDashboardChart';

const DashboardChartCard = ({
  title,
  chartType,
  description,
  chartKey,
  defaultPeriod = 'daily',
  enabled = true,
  children,
}) => {
  const {
    data,
    loading,
    period,
    setPeriod,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
  } = useDashboardChart(chartKey, defaultPeriod, enabled);

  return (
    <div className="dashboard-chart-card overflow-hidden rounded-2xl border border-emerald-100/80 bg-white shadow-sm shadow-emerald-950/5">
      <div className="dashboard-chart-card-header border-b border-emerald-50 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
              {chartType && (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-100">
                  {chartType}
                </span>
              )}
            </div>
            {description && (
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{description}</p>
            )}
          </div>
          <ChartPeriodFilter
            period={period}
            onPeriodChange={setPeriod}
            dateFrom={dateFrom}
            dateTo={dateTo}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            compact
          />
        </div>
      </div>
      <div className="h-72 px-3 pb-4 pt-2">
        {period === 'custom' && (!dateFrom || !dateTo) ? (
          <p className="flex h-full items-center justify-center text-sm text-slate-500">
            Select from and to dates to view chart
          </p>
        ) : !enabled ? (
          <p className="flex h-full items-center justify-center text-sm text-slate-400">
            Loading chart...
          </p>
        ) : data.length === 0 && loading ? (
          <p className="flex h-full items-center justify-center text-sm text-slate-400">
            Loading chart...
          </p>
        ) : data.length === 0 ? (
          <p className="flex h-full items-center justify-center text-sm text-slate-500">
            No data for selected filter
          </p>
        ) : (
          <div className={`h-full min-h-0 transition-opacity ${loading ? 'opacity-60' : ''}`}>
            {children(data, period)}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardChartCard;
