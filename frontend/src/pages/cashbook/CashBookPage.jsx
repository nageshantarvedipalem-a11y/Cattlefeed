import { useCallback, useEffect, useState } from 'react';
import { FiDownload, FiEdit2, FiPlus, FiPrinter, FiSearch, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import cashBookService from '../../services/cashBookService';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatDate } from '../../utils/format';
import { downloadBlob, getExportFilename } from '../../utils/download';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PeriodFilter from '../../components/common/PeriodFilter';
import usePeriodFilter from '../../hooks/usePeriodFilter';
import CashBookEntryModal from '../../components/cashbook/CashBookEntryModal';
import CashBookOpeningModal from '../../components/cashbook/CashBookOpeningModal';
import CashBookDailyReportModal from '../../components/cashbook/CashBookDailyReportModal';
import CashBookMonthlySummaryModal from '../../components/cashbook/CashBookMonthlySummaryModal';

const PERIOD_OPTIONS = [
  { value: 'daily', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'weekly', label: 'This Week' },
  { value: 'monthly', label: 'This Month' },
  { value: 'custom', label: 'Custom Range' },
];

const COLUMNS = [
  { key: 'date', label: 'Date', align: 'left', width: '9%' },
  { key: 'type', label: 'Type', align: 'left', width: '10%' },
  { key: 'category', label: 'Category', align: 'left', width: '11%' },
  { key: 'description', label: 'Description', align: 'left', width: '16%' },
  { key: 'method', label: 'Mode', align: 'left', width: '7%' },
  { key: 'jama', label: 'Jama', align: 'right', width: '10%' },
  { key: 'karchulu', label: 'Karchulu', align: 'right', width: '10%' },
  { key: 'balance', label: 'Balance', align: 'right', width: '10%' },
  { key: 'addedBy', label: 'Added By', align: 'left', width: '9%' },
  { key: 'actions', label: 'Actions', align: 'left', width: '8%' },
];

const headCellClass = (align) =>
  `px-3 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500 ${
    align === 'right' ? 'text-right' : 'text-left'
  }`;

const bodyCellClass = (align) =>
  `px-3 py-2.5 text-sm align-middle ${
    align === 'right' ? 'text-right tabular-nums whitespace-nowrap' : 'text-left'
  }`;

const todayLabel = () => new Date().toLocaleDateString('en-IN', {
  weekday: 'long',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const CashBookPage = () => {
  const { checkPermission } = useAuth();
  const canCreate = checkPermission('cashbook', 'create');
  const canEdit = checkPermission('cashbook', 'edit');
  const canDelete = checkPermission('cashbook', 'delete');

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [entries, setEntries] = useState([]);
  const [categories, setCategories] = useState({ jama: [], karchulu: [] });
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
  } = usePeriodFilter('daily');
  const [bookSide, setBookSide] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [entryKind, setEntryKind] = useState('jama');
  const [editingEntry, setEditingEntry] = useState(null);
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [openingModalOpen, setOpeningModalOpen] = useState(false);
  const [dailyReportOpen, setDailyReportOpen] = useState(false);
  const [monthlyOpen, setMonthlyOpen] = useState(false);

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
        bookSide: bookSide || undefined,
        paymentMethod: paymentMethod || undefined,
      });
      setSummary(response.data.data.summary);
      setEntries(response.data.data.entries);
      setCategories(response.data.data.categories || { jama: [], karchulu: [] });
      setPagination(response.data.data.pagination);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load cash book');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, apiParams, isReady, isCustomPending, isInvalidRange, bookSide, paymentMethod]);

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
        bookSide: bookSide || undefined,
        paymentMethod: paymentMethod || undefined,
      });
      downloadBlob(response.data, getExportFilename(response, `cash-book.${format === 'pdf' ? 'pdf' : 'xlsx'}`));
      toast.success(`Cash book exported as ${format.toUpperCase()}`);
    } catch {
      toast.error('Export failed');
    }
  };

  const openCreate = (kind) => {
    setEditingEntry(null);
    setEntryKind(kind);
    setEntryModalOpen(true);
  };

  const openEdit = (entry) => {
    setEditingEntry(entry);
    setEntryKind(entry.bookSide);
    setEntryModalOpen(true);
  };

  const handleDelete = async (entry) => {
    if (!window.confirm(`Delete this ${entry.bookSide === 'jama' ? 'Jama' : 'Karchulu'} entry of ${formatCurrency(entry.amount)}? Balances will be recalculated.`)) {
      return;
    }
    try {
      await cashBookService.deleteEntry(entry.id);
      toast.success('Entry deleted and balances updated');
      fetchCashBook();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete entry');
    }
  };

  const reportDate = summary?.periodStart && summary?.periodEnd && summary.periodStart === summary.periodEnd
    ? String(summary.periodStart).slice(0, 10)
    : new Date().toISOString().slice(0, 10);

  return (
    <div className="flex h-0 min-h-0 flex-1 flex-col overflow-hidden">
      <div id="cashbook-print-area" className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="mb-4 flex shrink-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Cash Book</h1>
            <p className="mt-1 text-sm text-slate-500">
              Daily Jama (money in) and Karchulu (money out) — {todayLabel()}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            {canCreate && (
              <>
                <button
                  type="button"
                  onClick={() => openCreate('jama')}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  <FiPlus className="h-4 w-4" /> Add Jama
                </button>
                <button
                  type="button"
                  onClick={() => openCreate('karchulu')}
                  className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
                >
                  <FiPlus className="h-4 w-4" /> Add Karchulu
                </button>
                <button
                  type="button"
                  onClick={() => setOpeningModalOpen(true)}
                  className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100"
                >
                  Set Opening
                </button>
              </>
            )}
            <button type="button" onClick={() => setDailyReportOpen(true)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
              Daily Report
            </button>
            <button type="button" onClick={() => setMonthlyOpen(true)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
              Monthly
            </button>
            <button type="button" onClick={() => handleExport('excel')} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
              <FiDownload className="h-4 w-4" /> Excel
            </button>
            <button type="button" onClick={() => handleExport('pdf')} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
              <FiDownload className="h-4 w-4" /> PDF
            </button>
            <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
              <FiPrinter className="h-4 w-4" /> Print
            </button>
          </div>
        </div>

        {summary && (
          <div className="mb-4 grid shrink-0 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Opening Balance', value: summary.openingBalance, color: 'text-slate-900' },
              { label: 'Total Jama', value: summary.totalJama ?? summary.totalInflow, color: 'text-emerald-700', prefix: '+' },
              { label: 'Total Karchulu', value: summary.totalKarchulu ?? summary.totalOutflow, color: 'text-red-700', prefix: '−' },
              { label: 'Closing Balance', value: summary.closingBalance, color: 'text-amber-700' },
            ].map((card) => (
              <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs text-slate-500">{card.label}</p>
                <p className={`mt-1 text-lg font-bold ${card.color}`}>
                  {card.prefix || ''}{formatCurrency(card.value)}
                </p>
              </div>
            ))}
          </div>
        )}
        {summary?.formula && (
          <p className="mb-3 shrink-0 text-xs text-slate-500">
            Closing = Opening + Jama − Karchulu ({formatCurrency(summary.openingBalance)} + {formatCurrency(summary.totalJama ?? 0)} − {formatCurrency(summary.totalKarchulu ?? 0)} = {formatCurrency(summary.closingBalance)})
          </p>
        )}

        <div className="mb-4 flex shrink-0 flex-wrap gap-2 print:hidden">
          <div className="relative min-w-[200px] max-w-md flex-1">
            <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search category, description..."
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
            options={PERIOD_OPTIONS}
          />
          <select
            value={bookSide}
            onChange={(e) => { setBookSide(e.target.value); setPage(1); }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
          >
            <option value="">All Types</option>
            <option value="jama">Jama</option>
            <option value="karchulu">Karchulu</option>
          </select>
          <select
            value={paymentMethod}
            onChange={(e) => { setPaymentMethod(e.target.value); setPage(1); }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
          >
            <option value="">All Modes</option>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="bank">Bank</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {loading && !entries.length ? (
            <div className="py-16"><LoadingSpinner /></div>
          ) : (
            <>
              <div className="min-h-0 flex-1 overflow-auto">
                <table className="w-full min-w-[980px] border-collapse" style={{ tableLayout: 'fixed' }}>
                  <colgroup>
                    {COLUMNS.map((col) => (
                      <col key={col.key} style={{ width: col.width }} />
                    ))}
                  </colgroup>
                  <thead className="sticky top-0 z-10 bg-slate-50 shadow-[inset_0_-1px_0_#e2e8f0]">
                    <tr>
                      {COLUMNS.map((col) => (
                        <th key={col.key} className={headCellClass(col.align)}>{col.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {isCustomPending ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-12 text-center text-sm text-slate-500">
                          Select from and to dates for custom range
                        </td>
                      </tr>
                    ) : entries.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-12 text-center text-sm text-slate-500">
                          No cash book entries for this period. Add Jama or Karchulu to start the day.
                        </td>
                      </tr>
                    ) : (
                      entries.map((entry) => {
                        const isJama = entry.bookSide === 'jama';
                        return (
                          <tr key={entry.id} className="hover:bg-slate-50/80">
                            <td className={`${bodyCellClass('left')} whitespace-nowrap text-slate-700`}>
                              {formatDate(entry.transactionDate)}
                            </td>
                            <td className={bodyCellClass('left')}>
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                                isJama ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {isJama ? 'JAMA' : 'KARCHULU'}
                              </span>
                            </td>
                            <td className={`${bodyCellClass('left')} text-slate-700`}>{entry.category || '—'}</td>
                            <td className={`${bodyCellClass('left')} text-slate-600`}>{entry.description || entry.remarks || '—'}</td>
                            <td className={`${bodyCellClass('left')} uppercase text-slate-600`}>{entry.paymentMethod || '—'}</td>
                            <td className={`${bodyCellClass('right')} font-medium text-emerald-700`}>
                              {isJama ? formatCurrency(entry.amount) : '—'}
                            </td>
                            <td className={`${bodyCellClass('right')} font-medium text-red-700`}>
                              {isJama ? '—' : formatCurrency(entry.amount)}
                            </td>
                            <td className={`${bodyCellClass('right')} font-semibold text-slate-900`}>
                              {formatCurrency(entry.balanceAfter)}
                            </td>
                            <td className={`${bodyCellClass('left')} text-slate-600`}>{entry.createdByName || '—'}</td>
                            <td className={`${bodyCellClass('left')} print:hidden`}>
                              {entry.isManual ? (
                                <div className="flex gap-2">
                                  {canEdit && (
                                    <button type="button" onClick={() => openEdit(entry)} className="text-slate-600 hover:text-primary-700" title="Edit">
                                      <FiEdit2 className="h-4 w-4" />
                                    </button>
                                  )}
                                  {canDelete && (
                                    <button type="button" onClick={() => handleDelete(entry)} className="text-slate-600 hover:text-red-700" title="Delete">
                                      <FiTrash2 className="h-4 w-4" />
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400">Auto</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className="shrink-0 border-t border-slate-200 bg-white print:hidden">
                <Pagination page={page} totalPages={pagination.totalPages} total={pagination.total} limit={limit} onPageChange={setPage} />
              </div>
            </>
          )}
        </div>
      </div>

      <CashBookEntryModal
        isOpen={entryModalOpen}
        onClose={() => { setEntryModalOpen(false); setEditingEntry(null); }}
        onSuccess={fetchCashBook}
        kind={entryKind}
        entry={editingEntry}
        categories={categories}
      />
      <CashBookOpeningModal
        isOpen={openingModalOpen}
        onClose={() => setOpeningModalOpen(false)}
        onSuccess={fetchCashBook}
        suggestedAmount={summary?.openingBalance || 0}
      />
      <CashBookDailyReportModal
        isOpen={dailyReportOpen}
        onClose={() => setDailyReportOpen(false)}
        initialDate={reportDate}
      />
      <CashBookMonthlySummaryModal
        isOpen={monthlyOpen}
        onClose={() => setMonthlyOpen(false)}
      />
    </div>
  );
};

export default CashBookPage;
