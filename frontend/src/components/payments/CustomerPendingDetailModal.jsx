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

const ActionIconButton = ({ label, onClick, className = '', children }) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    onClick={onClick}
    className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 ${className}`}
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
      totalAmount: customer?.totalAmount ?? totalAmount,
      paidAmount: customer?.paidAmount ?? paidAmount,
      pendingAmount: customer?.pendingAmount ?? pendingAmount,
    };
  }, [customer, invoices]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-6">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg font-bold text-slate-900">
              {customer?.customerName || 'Customer details'}
            </h2>
            <p className="mt-1 truncate text-sm text-slate-500">
              {customer?.customerPhone || 'No phone'}
              {customer?.customerVillage ? ` · ${customer.customerVillage}` : ''}
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
            <div className="grid shrink-0 grid-cols-2 gap-3 border-b border-slate-100 px-4 py-4 sm:grid-cols-4 sm:px-6">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Bills</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{summary.billCount}</p>
                <p className="mt-0.5 text-[11px] text-slate-400">{summary.pendingBillCount} pending</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Total</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-slate-900">{formatCurrency(summary.totalAmount)}</p>
              </div>
              <div className="rounded-lg bg-emerald-50 p-3">
                <p className="text-xs text-emerald-700">Paid</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-emerald-700">{formatCurrency(summary.paidAmount)}</p>
              </div>
              <div className="rounded-lg bg-amber-50 p-3">
                <p className="text-xs text-amber-700">Pending</p>
                <p className="mt-1 text-lg font-bold tabular-nums text-amber-700">{formatCurrency(summary.pendingAmount)}</p>
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-6">
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

            <div className="min-h-0 flex-1 overflow-auto px-4 py-4 sm:px-6">
              {detailTab === 'bills' ? (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full min-w-[760px] table-fixed border-collapse">
                    <colgroup>
                      <col className="w-[14%]" />
                      <col className="w-[12%]" />
                      <col className="w-[13%]" />
                      <col className="w-[13%]" />
                      <col className="w-[13%]" />
                      <col className="w-[14%]" />
                      <col className="w-[21%]" />
                    </colgroup>
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Invoice</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Bill Date</th>
                        <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Total</th>
                        <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Paid</th>
                        <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Pending</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Status</th>
                        <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {invoices.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-3 py-10 text-center text-sm text-slate-500">
                            No bills found
                          </td>
                        </tr>
                      ) : (
                        invoices.map((invoice) => (
                          <tr key={invoice.id} className={invoice.isOverdue ? 'bg-red-50/40' : 'bg-white'}>
                            <td className="truncate px-3 py-3 text-sm font-medium text-slate-900">{invoice.invoiceNumber}</td>
                            <td className="whitespace-nowrap px-3 py-3 text-sm text-slate-600">{formatDate(invoice.saleDate)}</td>
                            <td className="whitespace-nowrap px-3 py-3 text-right text-sm tabular-nums text-slate-800">{formatCurrency(invoice.totalAmount)}</td>
                            <td className="whitespace-nowrap px-3 py-3 text-right text-sm tabular-nums text-emerald-700">{formatCurrency(invoice.paidAmount)}</td>
                            <td className="whitespace-nowrap px-3 py-3 text-right text-sm font-medium tabular-nums text-amber-700">{formatCurrency(invoice.pendingAmount)}</td>
                            <td className="px-3 py-3">
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge[invoice.paymentStatus] || statusBadge.pending}`}>
                                {formatPaymentStatus(invoice.paymentStatus, invoice.paidAmount)}
                              </span>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center justify-end gap-1.5">
                                {canCreate && Number(invoice.pendingAmount) > 0 && (
                                  <ActionIconButton
                                    label="Receive payment"
                                    onClick={() => onReceiveSale(invoice)}
                                    className="border-primary-200 text-primary-700 hover:bg-primary-50 hover:text-primary-800"
                                  >
                                    <FiDollarSign className="h-4 w-4" />
                                  </ActionIconButton>
                                )}
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
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full min-w-[700px] table-fixed border-collapse">
                    <colgroup>
                      <col className="w-[14%]" />
                      <col className="w-[14%]" />
                      <col className="w-[14%]" />
                      <col className="w-[12%]" />
                      <col className="w-[18%]" />
                      <col className="w-[28%]" />
                    </colgroup>
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Date</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Invoice</th>
                        <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Amount</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Method</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Reference</th>
                        <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payments.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-3 py-10 text-center text-sm text-slate-500">
                            No payments recorded yet
                          </td>
                        </tr>
                      ) : (
                        payments.map((payment) => (
                          <tr key={payment.id}>
                            <td className="whitespace-nowrap px-3 py-3 text-sm text-slate-600">{formatDate(payment.paymentDate)}</td>
                            <td className="truncate px-3 py-3 text-sm font-medium text-slate-900">{payment.invoiceNumber || '—'}</td>
                            <td className="whitespace-nowrap px-3 py-3 text-right text-sm font-medium tabular-nums text-emerald-700">{formatCurrency(payment.amount)}</td>
                            <td className="whitespace-nowrap px-3 py-3 text-sm uppercase text-slate-700">{payment.paymentMethod}</td>
                            <td className="truncate px-3 py-3 text-sm text-slate-600">{payment.referenceNumber || '—'}</td>
                            <td className="truncate px-3 py-3 text-sm text-slate-500">{payment.remarks || '—'}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CustomerPendingDetailModal;
