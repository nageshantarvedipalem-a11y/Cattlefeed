import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FiDownload, FiPrinter, FiSearch } from 'react-icons/fi';
import toast from 'react-hot-toast';
import reportService from '../../services/reportService';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatPaymentStatus } from '../../utils/format';
import { catalogLabel } from '../../utils/catalogI18n';
import { downloadBlob, getExportFilename } from '../../utils/download';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PeriodFilter from '../../components/common/PeriodFilter';
import usePeriodFilter from '../../hooks/usePeriodFilter';

const statusBadge = {
  paid: 'bg-emerald-100 text-emerald-700',
  partial: 'bg-amber-100 text-amber-700',
  pending: 'bg-red-100 text-red-700',
};

const ReportsPage = () => {
  const { t } = useTranslation();
  const { checkPermission } = useAuth();
  const reportTypes = useMemo(() => [
    { id: 'summary', label: t('reports.tabSummary') },
    { id: 'sales', label: t('reports.tabSales') },
    { id: 'purchases', label: t('reports.tabPurchases') },
    { id: 'profit', label: t('reports.tabProfit') },
    { id: 'customers', label: t('reports.tabCustomers') },
    { id: 'stock', label: t('reports.tabStock') },
    { id: 'payments', label: t('reports.tabPayments') },
  ], [t]);
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
  } = usePeriodFilter('monthly');

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

  const fetchReport = useCallback(async () => {
    if (!isReady) {
      setLoading(false);
      if (!isCustomPending && isInvalidRange) {
        toast.error(t('common.dateFromAfterTo'));
      }
      return;
    }

    setLoading(true);
    try {
      const response = await reportService.getReport(reportType, {
        page: reportType === 'summary' ? 1 : page,
        limit: reportType === 'summary' ? 10 : limit,
        search: reportType === 'summary' ? undefined : (search || undefined),
        ...apiParams,
      });
      const data = response.data.data;
      setSummary(data.summary || null);
      setProfitSummary(data.summary && reportType === 'profit' ? data.summary : null);
      setRows(data.rows || []);
      setPagination(data.pagination || { total: 0, totalPages: 1 });
    } catch (error) {
      toast.error(error.response?.data?.message || t('reports.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [reportType, page, limit, search, apiParams, isReady, isCustomPending, isInvalidRange]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleTypeChange = (type) => {
    setReportType(type);
    setPage(1);
  };

  const handleExport = async (format) => {
    if (!isReady) {
      toast.error(isCustomPending ? t('common.selectCustomDates') : t('common.invalidDateRange'));
      return;
    }
    try {
      const response = await reportService.exportReport(reportType, {
        format,
        search: reportType === 'summary' ? undefined : (search || undefined),
        ...apiParams,
      });
      downloadBlob(response.data, getExportFilename(response, `${reportType}-report.${format === 'pdf' ? 'pdf' : 'xlsx'}`));
      toast.success(t('common.reportExportedAs', { format: format.toUpperCase() }));
    } catch {
      toast.error(t('common.exportFailed'));
    }
  };

  const renderSummary = () => {
    if (!summary) return null;
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: t('reports.tabSales'), count: summary.sales.count, amount: summary.sales.total, color: 'text-slate-900' },
          { label: t('reports.tabPurchases'), count: summary.purchases.count, amount: summary.purchases.total, color: 'text-slate-900' },
          { label: t('reports.tabProfit'), count: null, amount: summary.profit.amount, color: 'text-emerald-700' },
          { label: t('reports.cardPaymentsReceived'), count: summary.payments.count, amount: summary.payments.total, color: 'text-emerald-700' },
          { label: t('reports.cardCashNet'), count: null, amount: summary.cashBook.net, color: summary.cashBook.net >= 0 ? 'text-emerald-700' : 'text-red-700' },
          { label: t('reports.cardOutstanding'), count: summary.outstanding.pendingInvoices, amount: summary.outstanding.pendingAmount, color: 'text-amber-700' },
          { label: t('reports.cardActiveCustomers'), count: summary.customers.active, amount: null, color: 'text-slate-900' },
          { label: t('reports.cardLowStockItems'), count: summary.stock.lowStockProducts, amount: null, color: 'text-red-700' },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">{card.label}</p>
            {card.amount !== null && (
              <p className={`mt-1 text-xl font-bold ${card.color}`}>{formatCurrency(card.amount)}</p>
            )}
            {card.count !== null && (
              <p className="mt-1 text-sm text-slate-600">{card.count} {card.count !== 1 ? t('common.records') : t('common.recordOne')}</p>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderTable = () => {
    if (loading) return <div className="py-16"><LoadingSpinner /></div>;
    if (isCustomPending) {
      return <p className="py-12 text-center text-sm text-slate-500">{t('common.selectCustomDates')}</p>;
    }
    if (rows.length === 0) return <p className="py-12 text-center text-sm text-slate-500">{t('common.noRecordsPeriod')}</p>;

    switch (reportType) {
      case 'sales':
        return (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>{[
                t('common.invoice'),
                t('common.customer'),
                t('common.date'),
                t('common.total'),
                t('common.paid'),
                t('common.pending'),
                t('common.status'),
              ].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium">{row.invoiceNumber}</td>
                  <td className="px-4 py-3 text-sm">{row.customerName ? catalogLabel(row.customerName, 'customers') : t('common.walkIn')}</td>
                  <td className="px-4 py-3 text-sm">{new Date(row.saleDate).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-3 text-sm">{formatCurrency(row.totalAmount)}</td>
                  <td className="px-4 py-3 text-sm text-emerald-700">{formatCurrency(row.paidAmount)}</td>
                  <td className="px-4 py-3 text-sm text-amber-700">{formatCurrency(row.pendingAmount)}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs ${statusBadge[row.paymentStatus]}`}>{formatPaymentStatus(row.paymentStatus, row.paidAmount)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        );
      case 'purchases':
        return (
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>{[
                t('common.invoice'),
                t('common.supplier'),
                t('common.date'),
                t('common.total'),
                t('common.paid'),
                t('common.status'),
              ].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium">{row.invoiceNumber}</td>
                  <td className="px-4 py-3 text-sm">{catalogLabel(row.supplierName, 'suppliers')}</td>
                  <td className="px-4 py-3 text-sm">{new Date(row.purchaseDate).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-3 text-sm">{formatCurrency(row.totalAmount)}</td>
                  <td className="px-4 py-3 text-sm">{formatCurrency(row.paidAmount)}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs ${statusBadge[row.paymentStatus]}`}>{formatPaymentStatus(row.paymentStatus, row.paidAmount)}</span></td>
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
                  { label: t('profit.revenue'), value: profitSummary.revenue, color: 'text-slate-900' },
                  { label: t('profit.cost'), value: profitSummary.cost, color: 'text-red-700' },
                  { label: t('nav.profit'), value: profitSummary.profit, color: 'text-emerald-700' },
                ].map((c) => (
                  <div key={c.label}><p className="text-xs text-slate-500">{c.label}</p><p className={`font-bold ${c.color}`}>{formatCurrency(c.value)}</p></div>
                ))}
              </div>
            )}
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>{[
                  t('common.date'),
                  t('common.invoice'),
                  t('common.product'),
                  t('common.quantity'),
                  t('profit.revenue'),
                  t('nav.profit'),
                ].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm">{new Date(row.saleDate).toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-3 text-sm">{row.invoiceNumber}</td>
                    <td className="px-4 py-3 text-sm">{catalogLabel(row.productName, 'names')}</td>
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
              <tr>{[
                t('common.customer'),
                t('common.phone'),
                t('common.village'),
                t('common.balance'),
                t('common.periodSales'),
                t('common.pending'),
              ].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium">{catalogLabel(row.name, 'customers')}</td>
                  <td className="px-4 py-3 text-sm">{row.phone}</td>
                  <td className="px-4 py-3 text-sm">{row.village ? catalogLabel(row.village, 'villages') : '—'}</td>
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
              <tr>{[
                t('common.date'),
                t('common.product'),
                t('common.type'),
                t('common.quantity'),
                t('common.balance'),
                t('common.reference'),
              ].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm">{new Date(row.createdAt).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-sm">{catalogLabel(row.productName, 'names')}</td>
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
              <tr>{[
                t('common.date'),
                t('common.customer'),
                t('common.invoice'),
                t('common.amount'),
                t('common.method'),
                t('common.reference'),
              ].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm">{row.paymentDate}</td>
                  <td className="px-4 py-3 text-sm">{catalogLabel(row.customerName, 'customers')}</td>
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
            <h1 className="text-2xl font-bold text-slate-900">{t('reports.title')}</h1>
            <p className="mt-1 text-sm text-slate-500">{t('reports.pageSubtitle')}</p>
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
            <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
              <FiPrinter className="h-4 w-4" /> {t('common.print')}
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
          <PeriodFilter
            period={period}
            onPeriodChange={handlePeriodChange}
            dateFrom={dateFrom}
            onDateFromChange={(v) => { setDateFrom(v); setPage(1); }}
            dateTo={dateTo}
            onDateToChange={(v) => { setDateTo(v); setPage(1); }}
          />
          {reportType !== 'summary' && (
            <div className="relative min-w-[200px] flex-1 max-w-md">
              <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t('common.search')}
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
