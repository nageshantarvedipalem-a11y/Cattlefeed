import { useCallback, useEffect, useState } from 'react';
import { FiDownload, FiPlus, FiPrinter, FiSearch } from 'react-icons/fi';
import toast from 'react-hot-toast';
import cashBookService from '../../services/cashBookService';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../utils/format';
import { downloadBlob, getExportFilename } from '../../utils/download';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PeriodFilter from '../../components/common/PeriodFilter';
import usePeriodFilter from '../../hooks/usePeriodFilter';
import CashBookEntryModal from '../../components/cashbook/CashBookEntryModal';

const TYPE_LABELS = {
  cash_in: 'Cash In',
  cash_out: 'Cash Out',
  income: 'Income',
  expense: 'Expense',
  transfer: 'Transfer',
};

const inflowTypes = ['cash_in', 'income'];
const outflowTypes = ['cash_out', 'expense', 'transfer'];

const typeBadge = (type) => {
  if (inflowTypes.includes(type)) return 'bg-emerald-100 text-emerald-700';
  if (outflowTypes.includes(type)) return 'bg-red-100 text-red-700';
  return 'bg-slate-100 text-slate-700';
};

const CashBookPage = () => {
  const { checkPermission } = useAuth();
  const canCreate = checkPermission('cashbook', 'create');

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [entries, setEntries] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
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
  const [transactionType, setTransactionType] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [entryModalOpen, setEntryModalOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchCashBook = useCallback(async () => {
    if (!isReady) {
      setLoading(false);
      if (!isCustomPending && isInvalidRange) {
        toast.error('From date cannot be after To date');
      }
      return;
    }

    setLoading(true);
    try {
      const response = await cashBookService.getCashBook({
        page,
        limit,
        search: search || undefined,
        ...apiParams,
        transactionType: transactionType || undefined,
        paymentMethod: paymentMethod || undefined,
      });
      setSummary(response.data.data.summary);
      setEntries(response.data.data.entries);
      setPagination(response.data.data.pagination);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load cash book');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, apiParams, isReady, isCustomPending, isInvalidRange, transactionType, paymentMethod]);

  useEffect(() => {
    fetchCashBook();
  }, [fetchCashBook]);

  const handleExport = async (format) => {
    if (!isReady) {
      toast.error(isCustomPending ? 'Select from and to dates for custom range' : 'Invalid date range');
      return;
    }
    try {
      const response = await cashBookService.exportCashBook({
        format,
        search: search || undefined,
        ...apiParams,
        transactionType: transactionType || undefined,
        paymentMethod: paymentMethod || undefined,
      });
      downloadBlob(response.data, getExportFilename(response, `cash-book.${format === 'pdf' ? 'pdf' : 'xlsx'}`));
      toast.success(`Cash book exported as ${format.toUpperCase()}`);
    } catch {
      toast.error('Export failed');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      <div id="cashbook-print-area">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Cash Book</h1>
            <p className="mt-1 text-sm text-slate-500">Cash in/out, income, expenses, and running balance</p>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            {canCreate && (
              <button
                type="button"
                onClick={() => setEntryModalOpen(true)}
                className="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-700"
              >
                <FiPlus className="h-4 w-4" /> New Entry
              </button>
            )}
            <button type="button" onClick={() => handleExport('excel')} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
              <FiDownload className="h-4 w-4" /> Excel
            </button>
            <button type="button" onClick={() => handleExport('pdf')} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
              <FiDownload className="h-4 w-4" /> PDF
            </button>
            <button type="button" onClick={handlePrint} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
              <FiPrinter className="h-4 w-4" /> Print
            </button>
          </div>
        </div>

        {summary && (
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { label: 'Opening Balance', value: summary.openingBalance, color: 'text-slate-900' },
              { label: 'Total Inflow', value: summary.totalInflow, color: 'text-emerald-700' },
              { label: 'Total Outflow', value: summary.totalOutflow, color: 'text-red-700' },
              { label: 'Net Change', value: summary.netChange, color: summary.netChange >= 0 ? 'text-emerald-700' : 'text-red-700' },
              { label: 'Closing Balance', value: summary.closingBalance, color: 'text-amber-700' },
            ].map((card) => (
              <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs text-slate-500">{card.label}</p>
                <p className={`mt-1 text-lg font-bold ${card.color}`}>{formatCurrency(card.value)}</p>
              </div>
            ))}
          </div>
        )}

        <div className="mb-4 flex flex-wrap gap-2 print:hidden">
          <div className="relative min-w-[200px] flex-1 max-w-md">
            <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search category, remarks..."
              className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-4 text-sm outline-none focus:border-primary-500"
            />
          </div>
          <PeriodFilter
            period={period}
            onPeriodChange={(v) => { setPeriod(v); setPage(1); }}
            dateFrom={dateFrom}
            onDateFromChange={(v) => { setDateFrom(v); setPage(1); }}
            dateTo={dateTo}
            onDateToChange={(v) => { setDateTo(v); setPage(1); }}
          />
          <select
            value={transactionType}
            onChange={(e) => { setTransactionType(e.target.value); setPage(1); }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
          >
            <option value="">All Types</option>
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select
            value={paymentMethod}
            onChange={(e) => { setPaymentMethod(e.target.value); setPage(1); }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
          >
            <option value="">All Methods</option>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="card">Card</option>
            <option value="bank">Bank</option>
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
                      {['Date', 'Type', 'Category', 'Method', 'Amount', 'Balance', 'Reference', 'Remarks'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isCustomPending ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-500">
                          Select from and to dates for custom range
                        </td>
                      </tr>
                    ) : entries.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-500">No cash book entries for this period</td>
                      </tr>
                    ) : (
                      entries.map((entry) => (
                        <tr key={entry.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm">{entry.transactionDate}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${typeBadge(entry.transactionType)}`}>
                              {TYPE_LABELS[entry.transactionType] || entry.transactionType}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-700">{entry.category || '—'}</td>
                          <td className="px-4 py-3 text-sm uppercase text-slate-600">{entry.paymentMethod}</td>
                          <td className={`px-4 py-3 text-sm font-medium ${inflowTypes.includes(entry.transactionType) ? 'text-emerald-700' : 'text-red-700'}`}>
                            {inflowTypes.includes(entry.transactionType) ? '+' : '−'}{formatCurrency(entry.amount)}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-slate-900">{formatCurrency(entry.balanceAfter)}</td>
                          <td className="px-4 py-3 text-sm capitalize text-slate-600">
                            {entry.referenceType || '—'}{entry.referenceId ? ` #${entry.referenceId}` : ''}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">{entry.remarks || '—'}</td>
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

      <CashBookEntryModal
        isOpen={entryModalOpen}
        onClose={() => setEntryModalOpen(false)}
        onSuccess={fetchCashBook}
      />
    </div>
  );
};

export default CashBookPage;
