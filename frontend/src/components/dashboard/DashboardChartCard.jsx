import ChartPeriodFilter from './ChartPeriodFilter';
import useDashboardChart from '../../hooks/useDashboardChart';

const DashboardChartCard = ({ title, chartKey, defaultPeriod = 'daily', enabled = true, children }) => {
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
      <div className="dashboard-chart-card-header flex flex-wrap items-center justify-between gap-3 border-b border-emerald-50 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
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
      <div className="h-64 px-2 pb-3 pt-2">
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
            {children(data)}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardChartCard;
