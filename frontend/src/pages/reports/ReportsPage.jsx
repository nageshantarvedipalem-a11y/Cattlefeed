import { useCallback, useEffect, useState } from 'react';
import { FiDownload, FiPrinter, FiSearch } from 'react-icons/fi';
import toast from 'react-hot-toast';
import reportService from '../../services/reportService';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../utils/format';
import { downloadBlob, getExportFilename } from '../../utils/download';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const reportTypes = [
  { id: 'summary', label: 'Summary' },
  { id: 'sales', label: 'Sales' },
  { id: 'purchases', label: 'Purchases' },
  { id: 'profit', label: 'Profit' },
  { id: 'customers', label: 'Customers' },
  { id: 'stock', label: 'Stock' },
  { id: 'payments', label: 'Payments' },
];

const statusBadge = {
  paid: 'bg-emerald-100 text-emerald-700',
  partial: 'bg-amber-100 text-amber-700',
  pending: 'bg-red-100 text-red-700',
};

const ReportsPage = () => {
  const { checkPermission } = useAuth();
  const canExport = checkPermission('reports', 'export');

  const [reportType, setReportType] = useState('summary');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [profitSummary, setProfitSummary] = useState(null);
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState('monthly');

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const response = await reportService.getReport(reportType, {
        page: reportType === 'summary' ? 1 : page,
        limit: reportType === 'summary' ? 10 : limit,
        search: reportType === 'summary' ? undefined : (search || undefined),
        period: period || undefined,
      });
      const data = response.data.data;
      setSummary(data.summary || null);
      setProfitSummary(data.summary && reportType === 'profit' ? data.summary : null);
      setRows(data.rows || []);
      setPagination(data.pagination || { total: 0, totalPages: 1 });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [reportType, page, limit, search, period]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleTypeChange = (type) => {
    setReportType(type);
    setPage(1);
  };

  const handleExport = async (format) => {
    try {
      const response = await reportService.exportReport(reportType, {
        format,
        search: reportType === 'summary' ? undefined : (search || undefined),
        period: period || undefined,
      });
      downloadBlob(response.data, getExportFilename(response, `${reportType}-report.${format === 'pdf' ? 'pdf' : 'xlsx'}`));
      toast.success(`Report exported as ${format.toUpperCase()}`);
    } catch {
      toast.error('Export failed');
    }
  };

  const renderSummary = () => {
    if (!summary) return null;
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: 'Sales', count: summary.sales.count, amount: summary.sales.total, color: 'text-slate-900' },
          { label: 'Purchases', count: summary.purchases.count, amount: summary.purchases.total, color: 'text-slate-900' },
          { label: 'Profit', count: null, amount: summary.profit.amount, color: 'text-emerald-700' },
          { label: 'Payments Received', count: summary.payments.count, amount: summary.payments.total, color: 'text-emerald-700' },
          { label: 'Cash Net', count: null, amount: summary.cashBook.net, color: summary.cashBook.net >= 0 ? 'text-emerald-700' : 'text-red-700' },
          { label: 'Outstanding', count: summary.outstanding.pendingInvoices, amount: summary.outstanding.pendingAmount, color: 'text-amber-700' },
          { label: 'Active Customers', count: summary.customers.active, amount: null, color: 'text-slate-900' },
          { label: 'Low Stock Items', count: summary.stock.lowStockProducts, amount: null, color: 'text-red-700' },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">{card.label}</p>
            {card.amount !== null && (
              <p className={`mt-1 text-xl font-bold ${card.color}`}>{formatCurrency(card.amount)}</p>
            )}
            {card.count !== null && (
              <p className="mt-1 text-sm text-slate-600">{card.count} record{card.count !== 1 ? 's' : ''}</p>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderTable = () => {
    if (loading) return <div className="py-16"><LoadingSpinner /></div>;
    if (rows.length === 0) return <p className="py-12 text-center text-sm text-slate-500">No records for this report period</p>;

    switch (reportType) {
      case 'sales':
        return (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>{['Invoice', 'Customer', 'Date', 'Total', 'Paid', 'Pending', 'Status'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium">{row.invoiceNumber}</td>
                  <td className="px-4 py-3 text-sm">{row.customerName || 'Walk-in'}</td>
                  <td className="px-4 py-3 text-sm">{new Date(row.saleDate).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-3 text-sm">{formatCurrency(row.totalAmount)}</td>
                  <td className="px-4 py-3 text-sm text-emerald-700">{formatCurrency(row.paidAmount)}</td>
                  <td className="px-4 py-3 text-sm text-amber-700">{formatCurrency(row.pendingAmount)}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs capitalize ${statusBadge[row.paymentStatus]}`}>{row.paymentStatus}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case 'purchases':
        return (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>{['Invoice', 'Supplier', 'Date', 'Total', 'Paid', 'Status'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium">{row.invoiceNumber}</td>
                  <td className="px-4 py-3 text-sm">{row.supplierName}</td>
                  <td className="px-4 py-3 text-sm">{new Date(row.purchaseDate).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-3 text-sm">{formatCurrency(row.totalAmount)}</td>
                  <td className="px-4 py-3 text-sm">{formatCurrency(row.paidAmount)}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs capitalize ${statusBadge[row.paymentStatus]}`}>{row.paymentStatus}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case 'profit':
        return (
          <>
            {profitSummary && (
              <div className="grid gap-4 border-b border-slate-200 p-4 sm:grid-cols-3">
                {[
                  { label: 'Revenue', value: profitSummary.revenue, color: 'text-slate-900' },
                  { label: 'Cost', value: profitSummary.cost, color: 'text-red-700' },
                  { label: 'Profit', value: profitSummary.profit, color: 'text-emerald-700' },
                ].map((c) => (
                  <div key={c.label}><p className="text-xs text-slate-500">{c.label}</p><p className={`font-bold ${c.color}`}>{formatCurrency(c.value)}</p></div>
                ))}
              </div>
            )}
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>{['Date', 'Invoice', 'Product', 'Qty', 'Revenue', 'Profit'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm">{new Date(row.saleDate).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-3 text-sm">{row.invoiceNumber}</td>
                    <td className="px-4 py-3 text-sm">{row.productName}</td>
                    <td className="px-4 py-3 text-sm">{row.quantity}</td>
                    <td className="px-4 py-3 text-sm">{formatCurrency(row.totalAmount)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-emerald-700">{formatCurrency(row.profitAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        );
      case 'customers':
        return (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>{['Customer', 'Phone', 'Village', 'Balance', 'Period Sales', 'Pending'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium">{row.name}</td>
                  <td className="px-4 py-3 text-sm">{row.phone}</td>
                  <td className="px-4 py-3 text-sm">{row.village || '—'}</td>
                  <td className="px-4 py-3 text-sm">{formatCurrency(row.currentBalance)}</td>
                  <td className="px-4 py-3 text-sm">{formatCurrency(row.periodSalesAmount)}</td>
                  <td className="px-4 py-3 text-sm text-amber-700">{formatCurrency(row.pendingAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case 'stock':
        return (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>{['Date', 'Product', 'Type', 'Qty', 'Balance', 'Reference'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm">{new Date(row.createdAt).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-sm">{row.productName}</td>
                  <td className="px-4 py-3 text-sm uppercase">{row.movementType}</td>
                  <td className="px-4 py-3 text-sm">{row.quantity}</td>
                  <td className="px-4 py-3 text-sm">{row.balanceAfter}</td>
                  <td className="px-4 py-3 text-sm capitalize">{row.referenceType}{row.referenceId ? ` #${row.referenceId}` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case 'payments':
        return (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>{['Date', 'Customer', 'Invoice', 'Amount', 'Method', 'Reference'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm">{row.paymentDate}</td>
                  <td className="px-4 py-3 text-sm">{row.customerName}</td>
                  <td className="px-4 py-3 text-sm">{row.invoiceNumber || '—'}</td>
                  <td className="px-4 py-3 text-sm font-medium text-emerald-700">{formatCurrency(row.amount)}</td>
                  <td className="px-4 py-3 text-sm uppercase">{row.paymentMethod}</td>
                  <td className="px-4 py-3 text-sm">{row.referenceNumber || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <div id="reports-print-area">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
            <p className="mt-1 text-sm text-slate-500">Daily, monthly, and yearly business reports with export</p>
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
            <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
              <FiPrinter className="h-4 w-4" /> Print
            </button>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap gap-2 print:hidden">
          {reportTypes.map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => handleTypeChange(type.id)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                reportType === type.id ? 'bg-primary-600 text-white' : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>

        <div className="mb-4 flex flex-wrap gap-2 print:hidden">
          <select
            value={period}
            onChange={(e) => { setPeriod(e.target.value); setPage(1); }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
          >
            <option value="daily">Today</option>
            <option value="monthly">This Month</option>
            <option value="yearly">This Year</option>
            <option value="">All Time</option>
          </select>
          {reportType !== 'summary' && (
            <div className="relative min-w-[200px] flex-1 max-w-md">
              <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search..."
                className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-4 text-sm outline-none focus:border-primary-500"
              />
            </div>
          )}
        </div>

        {reportType === 'summary' ? (
          loading ? <div className="py-16"><LoadingSpinner /></div> : renderSummary()
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">{renderTable()}</div>
            {reportType !== 'summary' && (
              <div className="print:hidden">
                <Pagination page={page} totalPages={pagination.totalPages} total={pagination.total} limit={limit} onPageChange={setPage} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;
