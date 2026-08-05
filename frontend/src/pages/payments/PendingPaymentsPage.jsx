import { useCallback, useEffect, useState } from 'react';
import {
  FiDownload,
  FiMessageCircle,
  FiPrinter,
  FiSearch,
  FiDollarSign,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import paymentService from '../../services/paymentService';
import whatsappService from '../../services/whatsappService';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatPaymentStatus } from '../../utils/format';
import { downloadBlob, getExportFilename } from '../../utils/download';
import billingService from '../../services/billingService';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PeriodFilter from '../../components/common/PeriodFilter';
import usePeriodFilter from '../../hooks/usePeriodFilter';
import ReceivePaymentModal from '../../components/payments/ReceivePaymentModal';

const tabs = [
  { id: 'pending', label: 'Pending Payments' },
  { id: 'history', label: 'Completed Payments' },
];

const statusBadge = {
  paid: 'bg-emerald-100 text-emerald-700',
  partial: 'bg-amber-100 text-amber-700',
  pending: 'bg-red-100 text-red-700',
};

const PendingPaymentsPage = () => {
  const { checkPermission } = useAuth();
  const canCreate = checkPermission('payments', 'create');

  const [activeTab, setActiveTab] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [pendingSales, setPendingSales] = useState([]);
  const [payments, setPayments] = useState([]);
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
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchPending = useCallback(async () => {
    if (!isReady) {
      setLoading(false);
      if (!isCustomPending && isInvalidRange) {
        toast.error('From date cannot be after To date');
      }
      return;
    }

    setLoading(true);
    try {
      const response = await paymentService.getPendingPayments({
        page,
        limit,
        search: search || undefined,
        ...apiParams,
        overdueOnly: overdueOnly || undefined,
      });
      setSummary(response.data.data.summary);
      setPendingSales(response.data.data.pendingSales);
      setPagination(response.data.data.pagination);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load pending payments');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, apiParams, isReady, isCustomPending, isInvalidRange, overdueOnly]);

  const fetchHistory = useCallback(async () => {
    if (!isReady) {
      setLoading(false);
      if (!isCustomPending && isInvalidRange) {
        toast.error('From date cannot be after To date');
      }
      return;
    }

    setLoading(true);
    try {
      const response = await paymentService.getPaymentHistory({
        page,
        limit,
        search: search || undefined,
        ...apiParams,
      });
      setPayments(response.data.data.payments);
      setPagination(response.data.data.pagination);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load payment history');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, apiParams, isReady, isCustomPending, isInvalidRange]);

  useEffect(() => {
    if (activeTab === 'pending') fetchPending();
    else fetchHistory();
  }, [activeTab, fetchPending, fetchHistory]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setPage(1);
  };

  const handleReceive = (sale) => {
    setSelectedSale(sale);
    setReceiveModalOpen(true);
  };

  const handlePaymentSuccess = async (result) => {
    fetchPending();
    if (result?.payment?.id) {
      try {
        const response = await paymentService.downloadReceipt(result.payment.id);
        downloadBlob(response.data, getExportFilename(response, `receipt-PAY-${result.payment.id}.pdf`));
      } catch {
        // receipt download is optional
      }
    }
  };

  const handleWhatsApp = async (saleId) => {
    try {
      const response = await whatsappService.sendReminder(saleId);
      const data = response.data.data;

      if (data.sent && data.method === 'api') {
        toast.success('Payment reminder sent via WhatsApp');
        return;
      }

      const url = data.whatsappUrl;
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');
        toast.success('Opening WhatsApp with pre-filled reminder');
      } else {
        toast.error(data.reason || 'Customer phone number not available');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not send WhatsApp reminder');
    }
  };

  const handleExport = async (format) => {
    if (!isReady) {
      toast.error(isCustomPending ? 'Select from and to dates for custom range' : 'Invalid date range');
      return;
    }
    try {
      const response = await paymentService.exportPendingPayments({
        format,
        search: search || undefined,
        ...apiParams,
        overdueOnly: overdueOnly || undefined,
      });
      downloadBlob(response.data, getExportFilename(response, `pending-payments.${format === 'pdf' ? 'pdf' : 'xlsx'}`));
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch {
      toast.error('Export failed');
    }
  };

  const handlePrintBill = async (saleId, invoiceNumber) => {
    try {
      const response = await billingService.downloadInvoice(saleId, true);
      downloadBlob(response.data, getExportFilename(response, `${invoiceNumber}.pdf`));
    } catch {
      toast.error('Failed to download bill');
    }
  };

  const handleResendInvoice = async (saleId) => {
    try {
      await whatsappService.sendInvoice(saleId);
      toast.success('Invoice resent via WhatsApp');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to resend WhatsApp invoice');
    }
  };

  const handleViewBill = async (saleId) => {
    try {
      const response = await billingService.getSale(saleId);
      const sale = response.data.data.sale;
      window.alert(`${sale.invoiceNumber}\nCustomer: ${sale.customerName || 'Walk-in'}\nTotal: ${formatCurrency(sale.totalAmount)}\nPaid: ${formatCurrency(sale.paidAmount)}\nPending: ${formatCurrency(sale.pendingAmount)}`);
    } catch {
      toast.error('Failed to load bill details');
    }
  };

  const handlePrintReceipt = async (paymentId) => {
    try {
      const response = await paymentService.downloadReceipt(paymentId);
      downloadBlob(response.data, getExportFilename(response, `receipt-${paymentId}.pdf`));
    } catch {
      toast.error('Failed to download receipt');
    }
  };

  const handlePrint = () => window.print();

  return (
    <div>
      <div id="payments-print-area">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Pending Payments</h1>
            <p className="mt-1 text-sm text-slate-500">Track outstanding invoices and receive customer payments</p>
          </div>
          {activeTab === 'pending' && (
            <div className="flex flex-wrap gap-2 print:hidden">
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
          )}
        </div>

        {activeTab === 'pending' && summary && (
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Pending Invoices', value: summary.totalInvoices, format: 'number' },
              { label: 'Total Pending', value: summary.totalPending, format: 'currency' },
              { label: 'Overdue Count', value: summary.overdueCount, format: 'number' },
              { label: 'Overdue Amount', value: summary.overdueAmount, format: 'currency', color: 'text-red-700' },
            ].map((card) => (
              <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs text-slate-500">{card.label}</p>
                <p className={`mt-1 text-lg font-bold ${card.color || 'text-slate-900'}`}>
                  {card.format === 'currency' ? formatCurrency(card.value) : card.value}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="mb-4 flex flex-wrap gap-2 print:hidden">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                activeTab === tab.id
                  ? 'bg-primary-600 text-white'
                  : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mb-4 flex flex-wrap gap-2 print:hidden">
          <div className="relative min-w-[200px] flex-1 max-w-md">
            <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search invoice, customer, phone..."
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
          {activeTab === 'pending' && (
            <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={overdueOnly}
                onChange={(e) => { setOverdueOnly(e.target.checked); setPage(1); }}
              />
              Overdue only
            </label>
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="py-16"><LoadingSpinner /></div>
          ) : activeTab === 'pending' ? (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      {['Invoice', 'Customer', 'Phone', 'Bill Amount', 'Paid', 'Pending', 'Bill Date', 'Status', 'Actions'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isCustomPending ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-12 text-center text-sm text-slate-500">
                          Select from and to dates for custom range
                        </td>
                      </tr>
                    ) : pendingSales.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-12 text-center text-sm text-slate-500">No pending invoices found</td>
                      </tr>
                    ) : (
                      pendingSales.map((sale) => (
                        <tr key={sale.id} className={`hover:bg-slate-50 ${sale.isOverdue ? 'bg-red-50/40' : ''}`}>
                          <td className="px-4 py-3 text-sm font-medium text-slate-900">{sale.invoiceNumber}</td>
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-slate-900">{sale.customerName}</p>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">{sale.customerPhone || '—'}</td>
                          <td className="px-4 py-3 text-sm">{formatCurrency(sale.totalAmount)}</td>
                          <td className="px-4 py-3 text-sm text-emerald-700">{formatCurrency(sale.paidAmount)}</td>
                          <td className="px-4 py-3 text-sm font-medium text-amber-700">{formatCurrency(sale.pendingAmount)}</td>
                          <td className="px-4 py-3 text-sm">
                            {new Date(sale.saleDate).toLocaleDateString('en-IN')}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge[sale.paymentStatus] || statusBadge.pending}`}>
                              {formatPaymentStatus(sale.paymentStatus, sale.paidAmount)}
                            </span>
                          </td>
                          <td className="px-4 py-3 print:hidden">
                            <div className="flex flex-wrap gap-2">
                              {canCreate && (
                                <button
                                  type="button"
                                  onClick={() => handleReceive(sale)}
                                  className="inline-flex items-center gap-1 text-sm font-medium text-primary-700 hover:text-primary-800"
                                >
                                  <FiDollarSign className="h-4 w-4" /> Receive Payment
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleViewBill(sale.id)}
                                className="text-sm font-medium text-slate-700 hover:text-slate-900"
                              >
                                View Bill
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePrintBill(sale.id, sale.invoiceNumber)}
                                className="inline-flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-slate-900"
                              >
                                <FiPrinter className="h-4 w-4" /> Print Bill
                              </button>
                              <button
                                type="button"
                                onClick={() => handleResendInvoice(sale.id)}
                                className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-800"
                              >
                                <FiMessageCircle className="h-4 w-4" /> Resend WhatsApp
                              </button>
                            </div>
                          </td>
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
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      {['Date', 'Customer', 'Invoice', 'Amount', 'Method', 'Reference', 'Actions'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isCustomPending ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">
                          Select from and to dates for custom range
                        </td>
                      </tr>
                    ) : payments.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">No payment records found</td>
                      </tr>
                    ) : (
                      payments.map((payment) => (
                        <tr key={payment.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm">{payment.paymentDate}</td>
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-slate-900">{payment.customerName}</p>
                            <p className="text-xs text-slate-500">{payment.customerPhone}</p>
                          </td>
                          <td className="px-4 py-3 text-sm">{payment.invoiceNumber || '—'}</td>
                          <td className="px-4 py-3 text-sm font-medium text-emerald-700">{formatCurrency(payment.amount)}</td>
                          <td className="px-4 py-3 text-sm uppercase">{payment.paymentMethod}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{payment.referenceNumber || '—'}</td>
                          <td className="px-4 py-3 print:hidden">
                            <button
                              type="button"
                              onClick={() => handlePrintReceipt(payment.id)}
                              className="inline-flex items-center gap-1 text-sm font-medium text-primary-700 hover:text-primary-800"
                            >
                              <FiPrinter className="h-4 w-4" /> Receipt
                            </button>
                          </td>
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

      <ReceivePaymentModal
        isOpen={receiveModalOpen}
        onClose={() => setReceiveModalOpen(false)}
        onSuccess={handlePaymentSuccess}
        sale={selectedSale}
      />
    </div>
  );
};

export default PendingPaymentsPage;
