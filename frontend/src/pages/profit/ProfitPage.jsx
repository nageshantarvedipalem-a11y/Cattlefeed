import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { FiDownload, FiPrinter, FiSearch, FiTrendingUp } from 'react-icons/fi';
import toast from 'react-hot-toast';
import profitService from '../../services/profitService';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../utils/format';
import { catalogLabel } from '../../utils/catalogI18n';
import { downloadBlob, getExportFilename } from '../../utils/download';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PeriodFilter from '../../components/common/PeriodFilter';
import usePeriodFilter from '../../hooks/usePeriodFilter';
import DashboardChartCard from '../../components/dashboard/DashboardChartCard';

const ProfitPage = () => {
  const { t } = useTranslation();
  const profitPeriodOptions = useMemo(() => [
    { value: '', label: t('profit.periodAllTime') },
    { value: 'daily', label: t('profit.periodToday') },
    { value: 'monthly', label: t('profit.periodThisMonth') },
    { value: 'yearly', label: t('profit.periodThisYear') },
    { value: 'custom', label: t('common.customRange') },
  ], [t]);
    const { checkPermission } = useAuth();
  const canExport = checkPermission('reports', 'export');

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [filteredTotals, setFilteredTotals] = useState(null);
  const [entries, setEntries] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const {
    period,
    setPeriod,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    apiParams,
    isReady,
    isCustomPending,
    isInvalidRange,
  } = usePeriodFilter('');

  const handlePeriodChange = (value) => {
    setPeriod(value);
    setPage(1);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchProfit = useCallback(async () => {
    if (!isReady) {
      setLoading(false);
      if (!isCustomPending && isInvalidRange) {
        toast.error(t('common.dateFromAfterTo'));
      }
      return;
    }

    setLoading(true);
    try {
      const response = await profitService.getProfit({
        page,
        limit,
        search: search || undefined,
        ...apiParams,
      });
      const data = response.data.data;
      setSummary(data.summary);
      setFilteredTotals(data.filteredTotals);
      setEntries(data.entries);
      setPagination(data.pagination);
    } catch (error) {
      toast.error(error.response?.data?.message || t('profit.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, apiParams, isReady, isCustomPending, isInvalidRange]);

  useEffect(() => {
    fetchProfit();
  }, [fetchProfit]);

  const handleExport = async (format) => {
    if (!isReady) {
      toast.error(isCustomPending ? t('common.selectCustomDates') : t('common.invalidDateRange'));
      return;
    }
    try {
      const response = await profitService.exportProfit({
        format,
        search: search || undefined,
        ...apiParams,
      });
      downloadBlob(response.data, getExportFilename(response, `profit-report.${format === 'pdf' ? 'pdf' : 'xlsx'}`));
      toast.success(t('common.profitExportedAs', { format: format.toUpperCase() }));
    } catch {
      toast.error(t('common.exportFailed'));
    }
  };

  const handlePrint = () => window.print();

  const chartLabel = (value) => {
    if (!value) return '';
    const str = String(value);
    return str.length > 10 ? str.slice(5) : str;
  };

  return (
    <div>
      <div id="profit-print-area">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t('profit.title')}</h1>
            <p className="mt-1 text-sm text-slate-500">{t('profit.pageSubtitle')}</p>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            {canExport && (
              <>
                <button type="button" onClick={() => handleExport('excel')} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
                  <FiDownload className="h-4 w-4" /> {t('common.excel')}
                </button>
                <button type="button" onClick={() => handleExport('pdf')} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
                  <FiDownload className="h-4 w-4" /> {t('common.pdf')}
                </button>
              </>
            )}
            <button type="button" onClick={handlePrint} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
              <FiPrinter className="h-4 w-4" /> {t('common.print')}
            </button>
          </div>
        </div>

        {summary && (
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: t('profit.todaysProfit'), value: summary.today.profit, sub: t('profit.sales', { count: summary.today.saleCount }) },
              { label: t('profit.monthlyProfit'), value: summary.monthly.profit, sub: t('profit.sales', { count: summary.monthly.saleCount }) },
              { label: t('profit.yearlyProfit'), value: summary.yearly.profit, sub: t('profit.sales', { count: summary.yearly.saleCount }) },
              { label: t('profit.overallProfit'), value: summary.overall.profit, sub: t('profit.sales', { count: summary.overall.saleCount }), highlight: true },
            ].map((card) => (
              <div key={card.label} className={`rounded-xl border bg-white p-4 shadow-sm ${card.highlight ? 'border-emerald-200 bg-emerald-50/40' : 'border-slate-200'}`}>
                <div className="flex items-center gap-2">
                  <FiTrendingUp className={`h-4 w-4 ${card.highlight ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <p className="text-xs text-slate-500">{card.label}</p>
                </div>
                <p className={`mt-1 text-xl font-bold ${card.highlight ? 'text-emerald-700' : 'text-slate-900'}`}>
                  {formatCurrency(card.value)}
                </p>
                <p className="mt-1 text-xs text-slate-500">{card.sub}</p>
              </div>
            ))}
          </div>
        )}

        {filteredTotals && (
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            {[
              { label: t('profit.filteredRevenue'), value: filteredTotals.revenue, color: 'text-slate-900' },
              { label: t('profit.filteredCost'), value: filteredTotals.cost, color: 'text-red-700' },
              { label: t('profit.filteredProfit'), value: filteredTotals.profit, color: 'text-emerald-700' },
            ].map((card) => (
              <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs text-slate-500">{card.label}</p>
                <p className={`mt-1 text-lg font-bold ${card.color}`}>{formatCurrency(card.value)}</p>
              </div>
            ))}
          </div>
        )}

        <div className="mb-6 print:hidden">
          <DashboardChartCard title={t('profit.profitTrend')} chartKey="profit" defaultPeriod="monthly">
            {(chartData) => (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tickFormatter={chartLabel} fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    name={t('profit.chartProfit')}
                    stroke="#16a34a"
                    strokeWidth={2}
                    dot={{ r: 5, fill: '#16a34a', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 7 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name={t('profit.chartRevenue')}
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 5, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </DashboardChartCard>
        </div>

        <div className="mb-4 flex flex-wrap gap-2 print:hidden">
          <div className="relative min-w-[200px] flex-1 max-w-md">
            <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t('profit.searchPlaceholder')}
              className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-4 text-sm outline-none focus:border-primary-500"
            />
          </div>
          <PeriodFilter
            period={period}
            onPeriodChange={handlePeriodChange}
            dateFrom={dateFrom}
            onDateFromChange={(v) => { setDateFrom(v); setPage(1); }}
            dateTo={dateTo}
            onDateToChange={(v) => { setDateTo(v); setPage(1); }}
            options={profitPeriodOptions}
          />
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {loading && !entries.length ? (
            <div className="py-16"><LoadingSpinner /></div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      {[
                        t('common.date'),
                        t('common.invoice'),
                        t('common.customer'),
                        t('common.product'),
                        t('common.quantity'),
                        t('profit.cost'),
                        t('profit.revenue'),
                        t('nav.profit'),
                      ].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isCustomPending ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-500">
                          {t('common.selectCustomDates')}
                        </td>
                      </tr>
                    ) : entries.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-500">{t('profit.noEntries')}</td>
                      </tr>
                    ) : (
                      entries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm">{new Date(entry.saleDate).toLocaleDateString('en-IN')}</td>
                          <td className="px-4 py-3 text-sm font-medium">{entry.invoiceNumber}</td>
                          <td className="px-4 py-3 text-sm">{catalogLabel(entry.customerName, 'customers')}</td>
                          <td className="px-4 py-3 text-sm">{catalogLabel(entry.productName, 'names')}</td>
                          <td className="px-4 py-3 text-sm">{entry.quantity}</td>
                          <td className="px-4 py-3 text-sm text-red-700">{formatCurrency(entry.costAmount)}</td>
                          <td className="px-4 py-3 text-sm">{formatCurrency(entry.totalAmount)}</td>
                          <td className="px-4 py-3 text-sm font-medium text-emerald-700">{formatCurrency(entry.profitAmount)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="print:hidden">
                <Pagination page={page} totalPages={pagination.totalPages} total={pagination.total} limit={limit} onPageChange={setPage} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfitPage;
