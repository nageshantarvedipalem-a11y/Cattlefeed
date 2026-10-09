import { useEffect, useMemo, useState } from 'react';
import { FiDollarSign, FiMessageCircle, FiPrinter, FiEye, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import paymentService from '../../services/paymentService';
import { formatCurrency, formatDate, formatPaymentStatus } from '../../utils/format';
import { catalogLabel } from '../../utils/catalogI18n';
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
    className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition ${
      hidden
        ? 'pointer-events-none opacity-0'
        : `border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 ${className}`
    }`}
  >
    {children}
  </button>
);

const SummaryTile = ({ label, value, hint, tone = 'slate' }) => {
  const tones = {
    slate: 'bg-slate-50 text-slate-500 [&_strong]:text-slate-900',
    green: 'bg-emerald-50 text-emerald-700 [&_strong]:text-emerald-700',
    amber: 'bg-amber-50 text-amber-700 [&_strong]:text-amber-700',
  };
  return (
    <div className={`flex min-h-[64px] flex-col justify-center rounded-lg px-3 py-2 ${tones[tone]}`}>
      <p className="text-[11px] font-medium uppercase tracking-wide">{label}</p>
      <strong className="mt-0.5 text-base font-bold tabular-nums leading-tight">{value}</strong>
      {hint ? <p className="mt-0.5 text-[11px] opacity-70">{hint}</p> : null}
    </div>
  );
};

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

  const rawCustomerName = customer?.customerName || invoices[0]?.customerName;
  const displayName = rawCustomerName || 'Customer details';
  const phone = customer?.customerPhone || invoices[0]?.customerPhone || '';
  const village = customer?.customerVillage || invoices[0]?.customerVillage || '';
  const displayNameLabel = rawCustomerName
    ? catalogLabel(rawCustomerName, 'customers')
    : displayName;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4">
      <div className="flex max-h-[min(82vh,640px)] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div className="min-w-0 flex-1 pr-2">
            <h2 className="truncate text-base font-bold text-slate-900">{displayNameLabel}</h2>
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {[phone, village ? catalogLabel(village, 'villages') : ''].filter(Boolean).join(' · ') || 'No phone'}
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
          <div className="py-12"><LoadingSpinner /></div>
        ) : (
          <>
            <div className="grid shrink-0 grid-cols-2 gap-2 border-b border-slate-100 px-4 py-3 sm:grid-cols-4">
              <SummaryTile
                label="Bills"
                value={summary.billCount}
                hint={`${summary.pendingBillCount} pending`}
              />
              <SummaryTile
                label="Total"
                value={formatCurrency(summary.totalAmount)}
              />
              <SummaryTile
                label="Paid"
                value={formatCurrency(summary.paidAmount)}
                tone="green"
              />
              <SummaryTile
                label="Pending"
                value={formatCurrency(summary.pendingAmount)}
                tone="amber"
              />
            </div>

            <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 px-4 py-2.5">
              <div className="flex min-w-0 flex-1 gap-1.5">
                {[
                  { id: 'bills', label: `Bills (${invoices.length})` },
                  { id: 'payments', label: `Payments (${payments.length})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setDetailTab(tab.id)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium ${
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
                  className="inline-flex shrink-0 items-center gap-1 rounded-md bg-primary-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-primary-700"
                >
                  <FiDollarSign className="h-3.5 w-3.5" /> Receive Payment
                </button>
              )}
            </div>

            <div className="flex min-h-0 flex-1 flex-col px-4 py-3">
              <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-slate-200">
                {detailTab === 'bills' ? (
                  invoices.length === 0 ? (
                    <p className="px-3 py-8 text-center text-sm text-slate-500">No bills found</p>
                  ) : (
                    <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                      <thead className="sticky top-0 z-10 bg-slate-50">
                        <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          <th className="whitespace-nowrap px-3 py-2 font-semibold">Invoice</th>
                          <th className="whitespace-nowrap px-3 py-2 font-semibold">Bill Date</th>
                          <th className="whitespace-nowrap px-3 py-2 text-right font-semibold">Total</th>
                          <th className="whitespace-nowrap px-3 py-2 text-right font-semibold">Paid</th>
                          <th className="whitespace-nowrap px-3 py-2 text-right font-semibold">Pending</th>
                          <th className="whitespace-nowrap px-3 py-2 text-center font-semibold">Status</th>
                          <th className="whitespace-nowrap px-3 py-2 text-right font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {invoices.map((invoice) => {
                          const canReceive = canCreate && Number(invoice.pendingAmount) > 0;
                          return (
                            <tr
                              key={invoice.id}
                              className={invoice.isOverdue ? 'bg-red-50/40' : 'bg-white'}
                            >
                              <td className="max-w-[120px] truncate px-3 py-2 font-medium text-slate-900">
                                {invoice.invoiceNumber}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                                {formatDate(invoice.saleDate)}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-slate-800">
                                {formatCurrency(invoice.totalAmount)}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-emerald-700">
                                {formatCurrency(invoice.paidAmount)}
                              </td>
                              <td className="whitespace-nowrap px-3 py-2 text-right font-medium tabular-nums text-amber-700">
                                {formatCurrency(invoice.pendingAmount)}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${statusBadge[invoice.paymentStatus] || statusBadge.pending}`}>
                                  {formatPaymentStatus(invoice.paymentStatus, invoice.paidAmount)}
                                </span>
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex items-center justify-end gap-1">
                                  <ActionIconButton
                                    label="Receive payment"
                                    hidden={!canReceive}
                                    onClick={() => onReceiveSale(invoice)}
                                    className="border-primary-200 text-primary-700 hover:bg-primary-50 hover:text-primary-800"
                                  >
                                    <FiDollarSign className="h-3.5 w-3.5" />
                                  </ActionIconButton>
                                  <ActionIconButton label="View bill" onClick={() => onViewBill(invoice.id)}>
                                    <FiEye className="h-3.5 w-3.5" />
                                  </ActionIconButton>
                                  <ActionIconButton label="Print bill" onClick={() => onPrintBill(invoice.id, invoice.invoiceNumber)}>
                                    <FiPrinter className="h-3.5 w-3.5" />
                                  </ActionIconButton>
                                  <ActionIconButton
                                    label="WhatsApp"
                                    onClick={() => onResendInvoice(invoice.id)}
                                    className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                                  >
                                    <FiMessageCircle className="h-3.5 w-3.5" />
                                  </ActionIconButton>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )
                ) : (
                  payments.length === 0 ? (
                    <p className="px-3 py-8 text-center text-sm text-slate-500">No payments recorded yet</p>
                  ) : (
                    <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                      <thead className="sticky top-0 z-10 bg-slate-50">
                        <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          <th className="whitespace-nowrap px-3 py-2 font-semibold">Date</th>
                          <th className="whitespace-nowrap px-3 py-2 font-semibold">Invoice</th>
                          <th className="whitespace-nowrap px-3 py-2 text-right font-semibold">Amount</th>
                          <th className="whitespace-nowrap px-3 py-2 font-semibold">Method</th>
                          <th className="whitespace-nowrap px-3 py-2 font-semibold">Reference</th>
                          <th className="whitespace-nowrap px-3 py-2 font-semibold">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {payments.map((payment) => (
                          <tr key={payment.id} className="bg-white">
                            <td className="whitespace-nowrap px-3 py-2 text-slate-600">{formatDate(payment.paymentDate)}</td>
                            <td className="max-w-[120px] truncate px-3 py-2 font-medium text-slate-900">{payment.invoiceNumber || '—'}</td>
                            <td className="whitespace-nowrap px-3 py-2 text-right font-medium tabular-nums text-emerald-700">{formatCurrency(payment.amount)}</td>
                            <td className="whitespace-nowrap px-3 py-2 uppercase text-slate-700">{payment.paymentMethod}</td>
                            <td className="max-w-[120px] truncate px-3 py-2 text-slate-600">{payment.referenceNumber || '—'}</td>
                            <td className="max-w-[160px] truncate px-3 py-2 text-slate-500">{payment.remarks || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CustomerPendingDetailModal;
