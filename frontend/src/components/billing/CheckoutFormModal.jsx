import { formatCurrency } from '../../utils/format';
import { sanitizePhoneInput, validateIndianMobile } from '../../utils/phoneValidation';
import LoadingSpinner from '../common/LoadingSpinner';

const paymentMethods = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'credit', label: 'Credit' },
];

const CheckoutFormModal = ({
  isOpen,
  onClose,
  customer,
  onCustomerChange,
  paymentMethod,
  onPaymentMethodChange,
  paidAmount,
  onPaidAmountChange,
  totals,
  effectivePaidAmount,
  pendingAmount,
  balanceReturn,
  paymentStatus,
  onSubmit,
  isSubmitting,
}) => {
  if (!isOpen) return null;

  const phoneCheck = customer.phone ? validateIndianMobile(customer.phone) : null;
  const phoneError = customer.phone && phoneCheck && !phoneCheck.valid ? phoneCheck.error : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-slate-200 px-6 py-4">
          <p className="text-xs uppercase tracking-wide text-emerald-600">Step 3 — Checkout</p>
          <h2 className="text-xl font-bold text-slate-900">Customer & Payment</h2>
          <p className="mt-1 text-sm text-slate-500">Invoice will be sent to WhatsApp after bill is generated</p>
        </div>

        <div className="space-y-4 px-6 py-4">
          <div className="rounded-xl bg-emerald-50 px-4 py-3 text-center">
            <p className="text-xs uppercase text-emerald-700">Total Bill Amount</p>
            <p className="text-2xl font-bold text-emerald-800">{formatCurrency(totals.grandTotal)}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600">Customer Name *</label>
              <input
                type="text"
                value={customer.name}
                onChange={(e) => onCustomerChange({ ...customer, name: e.target.value })}
                placeholder="Enter customer name"
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600">WhatsApp Mobile Number *</label>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={customer.phone}
                onChange={(e) => onCustomerChange({ ...customer, phone: sanitizePhoneInput(e.target.value) })}
                placeholder="10-digit mobile (e.g. 9123456789)"
                className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-1 ${
                  phoneError
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
                    : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-200'
                }`}
              />
              {phoneError ? (
                <p className="mt-1 text-xs text-red-600">{phoneError}</p>
              ) : (
                <p className="mt-1 text-xs text-slate-400">Enter 10 digits only — starts with 6, 7, 8, or 9</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Village (optional)</label>
              <input
                type="text"
                value={customer.village}
                onChange={(e) => onCustomerChange({ ...customer, village: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Address (optional)</label>
              <input
                type="text"
                value={customer.address}
                onChange={(e) => onCustomerChange({ ...customer, address: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Payment Type *</label>
              <select
                value={paymentMethod}
                onChange={(e) => onPaymentMethodChange(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
              >
                {paymentMethods.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Paid Amount *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={paymentMethod === 'credit' ? 0 : paidAmount}
                disabled={paymentMethod === 'credit'}
                onChange={(e) => onPaidAmountChange(e.target.value)}
                placeholder={String(totals.grandTotal)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 disabled:bg-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
            <div>
              <p className="text-xs text-slate-500">Pending</p>
              <p className="font-semibold text-amber-700">{formatCurrency(pendingAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Balance Return</p>
              <p className="font-semibold text-emerald-700">{formatCurrency(balanceReturn)}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-slate-500">Payment Status</p>
              <p className="font-bold uppercase text-slate-800">{paymentStatus}</p>
            </div>
          </div>

          {paymentStatus !== 'PAID' && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Partial or credit payment — customer will appear in <strong>Pending Payments</strong> until fully paid.
            </p>
          )}
          {paymentStatus === 'PAID' && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              Full payment — bill will be marked as <strong>PAID</strong> and saved to customer records.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Back
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting || Boolean(phoneError)}
            className="inline-flex h-10 min-w-[140px] items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {isSubmitting ? <LoadingSpinner size="sm" /> : 'Generate Bill'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutFormModal;
