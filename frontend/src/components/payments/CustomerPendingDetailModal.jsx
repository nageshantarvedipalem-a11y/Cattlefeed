import { useEffect, useMemo, useState } from 'react';
import { FiDollarSign, FiMessageCircle, FiPrinter, FiEye, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import paymentService from '../../services/paymentService';
import { formatCurrency, formatDate, formatPaymentStatus } from '../../utils/format';
import LoadingSpinner from '../common/LoadingSpinner';

const statusBadge = {
  paid: 'bg-emerald-100 text-emerald-700',
  partial: 'bg-amber-100 text-amber-700',
  pending: 'bg-red-100 text-red-700',
};

const ActionIconButton = ({ label, onClick, className = '', children, hidden = false }) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    disabled={hidden}
    onClick={onClick}
    className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition ${
      hidden
        ? 'pointer-events-none opacity-0'
        : `border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 ${className}`
    }`}
  >
    {children}
  </button>
);

const CustomerPendingDetailModal = ({
  isOpen,
  customerId,
  canCreate,
  onClose,
  onReceiveCustomer,
  onReceiveSale,
  onViewBill,
  onPrintBill,
  onResendInvoice,
  refreshToken = 0,
}) => {
  const [loading, setLoading] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [detailTab, setDetailTab] = useState('bills');

  useEffect(() => {
    if (!isOpen || !customerId) {
      setCustomer(null);
      setInvoices([]);
      setPayments([]);
      setDetailTab('bills');
      return undefined;
    }

    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        try {
          const response = await paymentService.getPendingCustomer(customerId);
          if (cancelled) return;
          setCustomer(response.data.data.customer);
          setInvoices(response.data.data.invoices || []);
          setPayments(response.data.data.payments || []);
          return;
        } catch {
          const [pendingRes, historyRes] = await Promise.all([
            paymentService.getPendingPayments({ customerId, page: 1, limit: 100 }),
            paymentService.getPaymentHistory({ customerId, page: 1, limit: 100 }),
          ]);
          if (cancelled) return;
          const rows = pendingRes.data.data.pendingSales || [];
          setInvoices(rows);
          setPayments(historyRes.data.data.payments || []);
          setCustomer({
            customerId,
            customerName: rows[0]?.customerName || 'Customer',
            customerPhone: rows[0]?.customerPhone,
            customerVillage: rows[0]?.customerVillage,
            invoiceCount: rows.length,
            totalAmount: rows.reduce((sum, row) => sum + Number(row.totalAmount || 0), 0),
            paidAmount: rows.reduce((sum, row) => sum + Number(row.paidAmount || 0), 0),
            pendingAmount: rows.reduce((sum, row) => sum + Number(row.pendingAmount || 0), 0),
          });
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(error.response?.data?.message || 'Failed to load customer bills');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [isOpen, customerId, refreshToken]);

  const summary = useMemo(() => {
    const totalAmount = invoices.reduce((sum, row) => sum + Number(row.totalAmount || 0), 0);
    const paidAmount = invoices.reduce((sum, row) => sum + Number(row.paidAmount || 0), 0);
    const pendingAmount = invoices.reduce((sum, row) => sum + Number(row.pendingAmount || 0), 0);
    return {
      billCount: invoices.length,
      pendingBillCount: invoices.filter((row) => Number(row.pendingAmount) > 0).length,
      totalAmount,
      paidAmount,
      pendingAmount,
    };
  }, [invoices]);

  const displayName = customer?.customerName
    || invoices[0]?.customerName
    || 'Customer details';
  const phone = customer?.customerPhone || invoices[0]?.customerPhone || '';
  const village = customer?.customerVillage || invoices[0]?.customerVillage || '';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4">
      <div className="flex h-[min(90vh,820px)] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0 flex-1 pr-2">
            <h2 className="truncate text-lg font-bold text-slate-900">{displayName}</h2>
            <p className="mt-1 truncate text-sm text-slate-500">
              {[phone, village].filter(Boolean).join(' · ') || 'No phone'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-16"><LoadingSpinner /></div>
        ) : (
          <>
            <div className="grid shrink-0 grid-cols-2 gap-3 border-b border-slate-100 px-5 py-4 md:grid-cols-4">
              <div className="rounded-lg bg-slate-50 px-3 py-3">
                <p className="text-xs font-medium text-slate-500">Bills</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{summary.billCount}</p>
                <p className="mt-0.5 text-[11px] text-slate-400">{summary.pendingBillCount} pending</p>
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-3">
                <p className="text-xs font-medium text-slate-500">Total</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">{formatCurrency(summary.totalAmount)}</p>
                <p className="mt-0.5 text-[11px] text-transparent">.</p>
              </div>
              <div className="rounded-lg bg-emerald-50 px-3 py-3">
                <p className="text-xs font-medium text-emerald-700">Paid</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-emerald-700">{formatCurrency(summary.paidAmount)}</p>
                <p className="mt-0.5 text-[11px] text-transparent">.</p>
              </div>
              <div className="rounded-lg bg-amber-50 px-3 py-3">
                <p className="text-xs font-medium text-amber-700">Pending</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-amber-700">{formatCurrency(summary.pendingAmount)}</p>
                <p className="mt-0.5 text-[11px] text-transparent">.</p>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
              <div className="flex gap-2">
                {[
                  { id: 'bills', label: `Bills (${invoices.length})` },
                  { id: 'payments', label: `Payments (${payments.length})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setDetailTab(tab.id)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                      detailTab === tab.id
                        ? 'bg-primary-600 text-white'
                        : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              {canCreate && Number(summary.pendingAmount) > 0 && (
                <button
                  type="button"
                  onClick={() => onReceiveCustomer({
                    ...customer,
                    customerName: displayName,
                    invoiceCount: summary.pendingBillCount || summary.billCount,
                    totalAmount: summary.totalAmount,
                    paidAmount: summary.paidAmount,
                    pendingAmount: summary.pendingAmount,
                    customerPendingTotal: summary.pendingAmount,
                  })}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
                >
                  <FiDollarSign className="h-4 w-4" /> Receive Payment
                </button>
              )}
            </div>

            {/* Purchase history: sticky header + independent vertical scroll */}
            <div className="flex min-h-0 flex-1 flex-col px-5 py-4">
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-200">
                {detailTab === 'bills' ? (
                  <>
                    <div className="shrink-0 overflow-x-auto border-b border-slate-200 bg-slate-50">
                      <div className="grid min-w-[900px] grid-cols-[1.1fr_1fr_1fr_1fr_1fr_0.9fr_1.2fr] px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <div>Invoice</div>
                        <div>Bill Date</div>
                        <div className="text-right">Total</div>
                        <div className="text-right">Paid</div>
                        <div className="text-right">Pending</div>
                        <div className="text-center">Status</div>
                        <div className="text-right">Actions</div>
                      </div>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto overflow-x-auto overscroll-contain [scrollbar-gutter:stable]">
                      {invoices.length === 0 ? (
                        <p className="px-3 py-10 text-center text-sm text-slate-500">No bills found</p>
                      ) : (
                        <div className="min-w-[900px] divide-y divide-slate-100">
                          {invoices.map((invoice) => {
                            const canReceive = canCreate && Number(invoice.pendingAmount) > 0;
                            return (
                              <div
                                key={invoice.id}
                                className={`grid grid-cols-[1.1fr_1fr_1fr_1fr_1fr_0.9fr_1.2fr] items-center px-3 py-2.5 ${
                                  invoice.isOverdue ? 'bg-red-50/40' : 'bg-white'
                                }`}
                              >
                                <div className="truncate pr-2 text-sm font-medium text-slate-900">{invoice.invoiceNumber}</div>
                                <div className="whitespace-nowrap pr-2 text-sm text-slate-600">{formatDate(invoice.saleDate)}</div>
                                <div className="whitespace-nowrap pr-2 text-right text-sm tabular-nums text-slate-800">{formatCurrency(invoice.totalAmount)}</div>
                                <div className="whitespace-nowrap pr-2 text-right text-sm tabular-nums text-emerald-700">{formatCurrency(invoice.paidAmount)}</div>
                                <div className="whitespace-nowrap pr-2 text-right text-sm font-medium tabular-nums text-amber-700">{formatCurrency(invoice.pendingAmount)}</div>
                                <div className="flex justify-center px-1">
                                  <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge[invoice.paymentStatus] || statusBadge.pending}`}>
                                    {formatPaymentStatus(invoice.paymentStatus, invoice.paidAmount)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-end gap-1 pl-2">
                                  <ActionIconButton
                                    label="Receive payment"
                                    hidden={!canReceive}
                                    onClick={() => onReceiveSale(invoice)}
                                    className="border-primary-200 text-primary-700 hover:bg-primary-50 hover:text-primary-800"
                                  >
                                    <FiDollarSign className="h-4 w-4" />
                                  </ActionIconButton>
                                  <ActionIconButton label="View bill" onClick={() => onViewBill(invoice.id)}>
                                    <FiEye className="h-4 w-4" />
                                  </ActionIconButton>
                                  <ActionIconButton label="Print bill" onClick={() => onPrintBill(invoice.id, invoice.invoiceNumber)}>
                                    <FiPrinter className="h-4 w-4" />
                                  </ActionIconButton>
                                  <ActionIconButton
                                    label="WhatsApp"
                                    onClick={() => onResendInvoice(invoice.id)}
                                    className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                                  >
                                    <FiMessageCircle className="h-4 w-4" />
                                  </ActionIconButton>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="shrink-0 overflow-x-auto border-b border-slate-200 bg-slate-50">
                      <div className="grid min-w-[800px] grid-cols-[1fr_1.1fr_1fr_0.8fr_1.2fr_1.4fr] px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <div>Date</div>
                        <div>Invoice</div>
                        <div className="text-right">Amount</div>
                        <div>Method</div>
                        <div>Reference</div>
                        <div>Remarks</div>
                      </div>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto overflow-x-auto overscroll-contain [scrollbar-gutter:stable]">
                      {payments.length === 0 ? (
                        <p className="px-3 py-10 text-center text-sm text-slate-500">No payments recorded yet</p>
                      ) : (
                        <div className="min-w-[800px] divide-y divide-slate-100">
                          {payments.map((payment) => (
                            <div key={payment.id} className="grid grid-cols-[1fr_1.1fr_1fr_0.8fr_1.2fr_1.4fr] items-center px-3 py-2.5">
                              <div className="whitespace-nowrap pr-2 text-sm text-slate-600">{formatDate(payment.paymentDate)}</div>
                              <div className="truncate pr-2 text-sm font-medium text-slate-900">{payment.invoiceNumber || '—'}</div>
                              <div className="whitespace-nowrap pr-2 text-right text-sm font-medium tabular-nums text-emerald-700">{formatCurrency(payment.amount)}</div>
                              <div className="whitespace-nowrap pr-2 text-sm uppercase text-slate-700">{payment.paymentMethod}</div>
                              <div className="truncate pr-2 text-sm text-slate-600">{payment.referenceNumber || '—'}</div>
                              <div className="truncate text-sm text-slate-500">{payment.remarks || '—'}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
              <p className="mt-2 shrink-0 text-xs text-slate-400">
                Scroll inside the list to see full purchase history.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CustomerPendingDetailModal;
