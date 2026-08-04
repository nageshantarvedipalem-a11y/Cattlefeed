import { useCallback, useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
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
import { downloadBlob, getExportFilename } from '../../utils/download';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const ProfitPage = () => {
  const { checkPermission } = useAuth();
  const canExport = checkPermission('reports', 'export');

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [filteredTotals, setFilteredTotals] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [entries, setEntries] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchProfit = useCallback(async () => {
    setLoading(true);
    try {
      const response = await profitService.getProfit({
        page,
        limit,
        search: search || undefined,
        period: period || undefined,
      });
      const data = response.data.data;
      setSummary(data.summary);
      setFilteredTotals(data.filteredTotals);
      setChartData(data.chartData);
      setEntries(data.entries);
      setPagination(data.pagination);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load profit data');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, period]);

  useEffect(() => {
    fetchProfit();
  }, [fetchProfit]);

  const handleExport = async (format) => {
    try {
      const response = await profitService.exportProfit({
        format,
        search: search || undefined,
        period: period || undefined,
      });
      downloadBlob(response.data, getExportFilename(response, `profit-report.${format === 'pdf' ? 'pdf' : 'xlsx'}`));
      toast.success(`Profit report exported as ${format.toUpperCase()}`);
    } catch {
      toast.error('Export failed');
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
            <h1 className="text-2xl font-bold text-slate-900">Profit Analysis</h1>
            <p className="mt-1 text-sm text-slate-500">Automatic profit from sales: selling price minus purchase cost</p>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            {canExport && (
              <>
                <button type="button" onClick={() => handleExport('excel')} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
                  <FiDownload className="h-4 w-4" /> Excel
                </button>
                <button type="button" onClick={() => handleExport('pdf')} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
                  <FiDownload className="h-4 w-4" /> PDF
                </button>
              </>
            )}
            <button type="button" onClick={handlePrint} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
              <FiPrinter className="h-4 w-4" /> Print
            </button>
          </div>
        </div>

        {summary && (
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Today's Profit", value: summary.today.profit, sub: `${summary.today.saleCount} sales` },
              { label: 'Monthly Profit', value: summary.monthly.profit, sub: `${summary.monthly.saleCount} sales` },
              { label: 'Yearly Profit', value: summary.yearly.profit, sub: `${summary.yearly.saleCount} sales` },
              { label: 'Overall Profit', value: summary.overall.profit, sub: `${summary.overall.saleCount} sales`, highlight: true },
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
              { label: 'Filtered Revenue', value: filteredTotals.revenue, color: 'text-slate-900' },
              { label: 'Filtered Cost', value: filteredTotals.cost, color: 'text-red-700' },
              { label: 'Filtered Profit', value: filteredTotals.profit, color: 'text-emerald-700' },
            ].map((card) => (
              <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs text-slate-500">{card.label}</p>
                <p className={`mt-1 text-lg font-bold ${card.color}`}>{formatCurrency(card.value)}</p>
              </div>
            ))}
          </div>
        )}

        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm print:hidden">
          <h2 className="mb-4 text-sm font-semibold text-slate-700">Profit Trend</h2>
          {loading ? (
            <div className="py-12"><LoadingSpinner /></div>
          ) : chartData.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-500">No profit data for this period</p>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" tickFormatter={chartLabel} fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="profit" name="Profit" fill="#16a34a" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="revenue" name="Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="mb-4 flex flex-wrap gap-2 print:hidden">
          <div className="relative min-w-[200px] flex-1 max-w-md">
            <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search invoice, product, customer..."
              className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-4 text-sm outline-none focus:border-primary-500"
            />
          </div>
          <select
            value={period}
            onChange={(e) => { setPeriod(e.target.value); setPage(1); }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
          >
            <option value="">All Time (12 months chart)</option>
            <option value="daily">Today (7-day chart)</option>
            <option value="monthly">This Month</option>
            <option value="yearly">This Year</option>
          </select>
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
                      {['Date', 'Invoice', 'Customer', 'Product', 'Qty', 'Cost', 'Revenue', 'Profit'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {entries.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-500">No profit entries for this period</td>
                      </tr>
                    ) : (
                      entries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm">{new Date(entry.saleDate).toLocaleDateString('en-IN')}</td>
                          <td className="px-4 py-3 text-sm font-medium">{entry.invoiceNumber}</td>
                          <td className="px-4 py-3 text-sm">{entry.customerName}</td>
                          <td className="px-4 py-3 text-sm">{entry.productName}</td>
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
