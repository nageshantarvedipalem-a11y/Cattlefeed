import { useCallback, useEffect, useState } from 'react';
import { FiDownload, FiEye, FiSearch } from 'react-icons/fi';
import toast from 'react-hot-toast';
import billingService from '../../services/billingService';
import whatsappService from '../../services/whatsappService';
import { formatCurrency, formatPaymentStatus } from '../../utils/format';
import { printInvoicePdf, downloadInvoicePdf } from '../../utils/printInvoice';
import LoadingSpinner from '../common/LoadingSpinner';
import InvoiceModal from './InvoiceModal';

const statusOptions = [
  { value: '', label: 'All statuses' },
  { value: 'paid', label: 'Paid' },
  { value: 'partial', label: 'Partially paid' },
  { value: 'pending', label: 'Credit / Pending' },
];

const periodOptions = [
  { value: '', label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Last 7 days' },
  { value: 'month', label: 'This month' },
  { value: 'custom', label: 'Custom range' },
];

const statusBadge = {
  paid: 'bg-emerald-100 text-emerald-700',
  partial: 'bg-amber-100 text-amber-700',
  pending: 'bg-red-100 text-red-700',
};

const formatDateInput = (d) => d.toISOString().slice(0, 10);

const getDateRange = (period, customFrom, customTo) => {
  const today = new Date();

  if (period === 'today') {
    return { dateFrom: formatDateInput(today), dateTo: formatDateInput(today) };
  }
  if (period === 'week') {
    const start = new Date(today);
    start.setDate(today.getDate() - 6);
    return { dateFrom: formatDateInput(start), dateTo: formatDateInput(today) };
  }
  if (period === 'month') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { dateFrom: formatDateInput(start), dateTo: formatDateInput(today) };
  }
  if (period === 'custom' && customFrom && customTo) {
    return { dateFrom: customFrom, dateTo: customTo };
  }
  return {};
};

const PreviousBillsPanel = () => {
  const [loading, setLoading] = useState(true);
  const [sales, setSales] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [period, setPeriod] = useState('');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchBills = useCallback(async () => {
    if (period === 'custom') {
      if (!customDateFrom || !customDateTo) {
        setSales([]);
        setPagination({ total: 0, totalPages: 1 });
        setLoading(false);
        return;
      }
      if (customDateFrom > customDateTo) {
        toast.error('From date cannot be after To date');
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    try {
      const dates = getDateRange(period, customDateFrom, customDateTo);
      const response = await billingService.getSales({
        page,
        limit: 15,
        search: search || undefined,
        paymentStatus: paymentStatus || undefined,
        dateFrom: dates.dateFrom,
        dateTo: dates.dateTo,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      setSales(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load previous bills');
    } finally {
      setLoading(false);
    }
  }, [page, search, paymentStatus, period, customDateFrom, customDateTo]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  const handleViewBill = async (saleId) => {
    try {
      const response = await billingService.getSale(saleId);
      setSelectedSale(response.data.data.sale);
    } catch {
      toast.error('Failed to load bill details');
    }
  };

  const handleDownload = async (sale) => {
    try {
      await downloadInvoicePdf(sale.id);
      toast.success('Choose "Save as PDF" in the print dialog to download');
    } catch {
      toast.error('Failed to download bill');
    }
  };

  const handlePrint = async (saleId) => {
    try {
      await printInvoicePdf(saleId);
    } catch (error) {
      toast.error(error.message || 'Failed to print invoice');
    }
  };

  const handleSendWhatsApp = async () => {
    if (!selectedSale) return;
    setSendingWhatsApp(true);
    try {
      await whatsappService.sendInvoice(selectedSale.id);
      toast.success('Invoice sent via WhatsApp');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send WhatsApp invoice');
    } finally {
      setSendingWhatsApp(false);
    }
  };

  const formatBillDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <>
      <div className="flex h-full min-h-0 flex-col">
        {/* Filters */}
        <div className="shrink-0 space-y-2 border-b border-slate-200 px-5 py-3">
          <div className="relative">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search invoice, customer, mobile..."
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={paymentStatus}
              onChange={(e) => { setPaymentStatus(e.target.value); setPage(1); }}
              className="rounded-lg border border-slate-300 px-2 py-2 text-sm outline-none focus:border-emerald-500"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <select
              value={period}
              onChange={(e) => {
                setPeriod(e.target.value);
                setPage(1);
                if (e.target.value !== 'custom') {
                  setCustomDateFrom('');
                  setCustomDateTo('');
                }
              }}
              className="rounded-lg border border-slate-300 px-2 py-2 text-sm outline-none focus:border-emerald-500"
            >
              {periodOptions.map((opt) => (
                <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {period === 'custom' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-500">From date</label>
                <input
                  type="date"
                  value={customDateFrom}
                  max={customDateTo || undefined}
                  onChange={(e) => { setCustomDateFrom(e.target.value); setPage(1); }}
                  className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-500">To date</label>
                <input
                  type="date"
                  value={customDateTo}
                  min={customDateFrom || undefined}
                  onChange={(e) => { setCustomDateTo(e.target.value); setPage(1); }}
                  className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* List */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <LoadingSpinner size="sm" />
            </div>
          ) : sales.length === 0 ? (
            <p className="px-5 py-16 text-center text-sm text-slate-500">
              {period === 'custom' && (!customDateFrom || !customDateTo)
                ? 'Select From and To dates to filter bills'
                : 'No bills found for selected filters'}
            </p>
          ) : (
            <>
              <div className="sticky top-0 z-10 grid grid-cols-[minmax(0,1fr)_4.5rem_5rem] gap-x-2 border-b border-slate-200 bg-slate-50 px-5 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                <span>Invoice / Customer</span>
                <span className="text-right">Total</span>
                <span className="text-right">Status</span>
              </div>
              <div className="divide-y divide-slate-100">
                {sales.map((sale, index) => (
                  <div
                    key={sale.id}
                    className={`px-5 py-3 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}`}
                  >
                    <div className="grid grid-cols-[minmax(0,1fr)_4.5rem_5rem] items-start gap-x-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">{sale.invoiceNumber}</p>
                        <p className="truncate text-xs text-slate-600">{sale.customerName || 'Walk-in'}</p>
                        <p className="text-[10px] text-slate-400">{formatBillDate(sale.saleDate)}</p>
                      </div>
                      <p className="text-right text-sm font-bold tabular-nums text-slate-900">
                        {formatCurrency(sale.totalAmount)}
                      </p>
                      <div className="text-right">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusBadge[sale.paymentStatus] || 'bg-slate-100 text-slate-600'}`}>
                          {formatPaymentStatus(sale.paymentStatus, sale.paidAmount)}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleViewBill(sale.id)}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                      >
                        <FiEye className="h-3 w-3" /> View
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownload(sale)}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                      >
                        <FiDownload className="h-3 w-3" /> PDF
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex shrink-0 items-center justify-between border-t border-slate-200 px-5 py-2 text-xs text-slate-600">
            <span>{pagination.total} bills</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40"
              >
                Prev
              </button>
              <span>{page} / {pagination.totalPages}</span>
              <button
                type="button"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedSale && (
        <InvoiceModal
          sale={selectedSale}
          onClose={() => setSelectedSale(null)}
          onDownload={() => handleDownload(selectedSale)}
          onPrint={() => handlePrint(selectedSale.id)}
          onSendWhatsApp={selectedSale.customerPhone ? handleSendWhatsApp : undefined}
          sendingWhatsApp={sendingWhatsApp}
        />
      )}
    </>
  );
};

export default PreviousBillsPanel;
