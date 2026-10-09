import { useEffect, useState } from 'react';
import { FiDollarSign, FiMessageCircle, FiPrinter, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import paymentService from '../../services/paymentService';
import { formatCurrency, formatDate, formatPaymentStatus } from '../../utils/format';
import LoadingSpinner from '../common/LoadingSpinner';

const statusBadge = {
  paid: 'bg-emerald-100 text-emerald-700',
  partial: 'bg-amber-100 text-amber-700',
  pending: 'bg-red-100 text-red-700',
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

  useEffect(() => {
    if (!isOpen || !customerId) {
      setCustomer(null);
      setInvoices([]);
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
          return;
        } catch {
          const fallback = await paymentService.getPendingPayments({ customerId, page: 1, limit: 100 });
          if (cancelled) return;
          const invoices = fallback.data.data.pendingSales
            || fallback.data.data.pendingCustomers
            || [];
          const rows = Array.isArray(invoices) && invoices[0]?.invoiceNumber
            ? invoices
            : [];
          setInvoices(rows);
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

  if (!isOpen) return null;

  const pendingInvoices = invoices.filter((invoice) => Number(invoice.pendingAmount) > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{customer?.customerName || 'Customer bills'}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {customer?.customerPhone || 'No phone'}
              {customer?.customerVillage ? ` · ${customer.customerVillage}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-16"><LoadingSpinner /></div>
        ) : (
          <>
            {customer && (
              <div className="grid gap-3 border-b border-slate-100 px-6 py-4 sm:grid-cols-4">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Bills</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">{customer.invoiceCount}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Total</p>
                  <p className="mt-1 text-lg font-bold text-slate-900">{formatCurrency(customer.totalAmount)}</p>
                </div>
                <div className="rounded-lg bg-emerald-50 p-3">
                  <p className="text-xs text-emerald-700">Paid</p>
                  <p className="mt-1 text-lg font-bold text-emerald-700">{formatCurrency(customer.paidAmount)}</p>
                </div>
                <div className="rounded-lg bg-amber-50 p-3">
                  <p className="text-xs text-amber-700">Pending</p>
                  <p className="mt-1 text-lg font-bold text-amber-700">{formatCurrency(customer.pendingAmount)}</p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 px-6 py-3">
              <p className="text-sm text-slate-500">
                Every bill for this customer. Fully paid invoices stay here for history.
              </p>
              {canCreate && customer && Number(customer.pendingAmount) > 0 && (
                <button
                  type="button"
                  onClick={() => onReceiveCustomer(customer)}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700"
                >
                  <FiDollarSign className="h-4 w-4" /> Receive Payment
                </button>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-auto px-6 pb-6">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    {['Invoice', 'Bill Date', 'Total', 'Paid', 'Pending', 'Status', 'Actions'].map((header) => (
                      <th key={header} className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">
                        {header}
                      </th>
                    ))}
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
                      <tr key={invoice.id} className={invoice.isOverdue ? 'bg-red-50/40' : ''}>
                        <td className="px-3 py-3 text-sm font-medium text-slate-900">{invoice.invoiceNumber}</td>
                        <td className="px-3 py-3 text-sm text-slate-600">{formatDate(invoice.saleDate)}</td>
                        <td className="px-3 py-3 text-sm">{formatCurrency(invoice.totalAmount)}</td>
                        <td className="px-3 py-3 text-sm text-emerald-700">{formatCurrency(invoice.paidAmount)}</td>
                        <td className="px-3 py-3 text-sm font-medium text-amber-700">{formatCurrency(invoice.pendingAmount)}</td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge[invoice.paymentStatus] || statusBadge.pending}`}>
                            {formatPaymentStatus(invoice.paymentStatus, invoice.paidAmount)}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-2">
                            {canCreate && Number(invoice.pendingAmount) > 0 && (
                              <button
                                type="button"
                                onClick={() => onReceiveSale(invoice)}
                                className="inline-flex items-center gap-1 text-sm font-medium text-primary-700 hover:text-primary-800"
                              >
                                <FiDollarSign className="h-4 w-4" /> Receive
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => onViewBill(invoice.id)}
                              className="text-sm font-medium text-slate-700 hover:text-slate-900"
                            >
                              View
                            </button>
                            <button
                              type="button"
                              onClick={() => onPrintBill(invoice.id, invoice.invoiceNumber)}
                              className="inline-flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-slate-900"
                            >
                              <FiPrinter className="h-4 w-4" /> Print
                            </button>
                            <button
                              type="button"
                              onClick={() => onResendInvoice(invoice.id)}
                              className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-800"
                            >
                              <FiMessageCircle className="h-4 w-4" /> WhatsApp
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {pendingInvoices.length === 0 && invoices.length > 0 && (
                <p className="mt-3 text-sm text-emerald-700">All listed bills are fully paid.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CustomerPendingDetailModal;
