import {
  FiMinus,
  FiPlus,
  FiShoppingCart,
  FiTrash2,
  FiUser,
} from 'react-icons/fi';
import { formatCurrency } from '../../utils/format';

const paymentMethods = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'credit', label: 'Credit' },
];

const statusStyles = {
  PAID: 'bg-emerald-100 text-emerald-700',
  'PARTIALLY PAID': 'bg-amber-100 text-amber-700',
  CREDIT: 'bg-red-100 text-red-700',
};

const PosBillingPanel = ({
  selectedBatch,
  barcode,
  onBarcodeChange,
  onBarcodeSubmit,
  barcodeRef,
  cart,
  onUpdateCartItem,
  onRemoveCartItem,
  calculateCartLine,
  billDiscount,
  onBillDiscountChange,
  customer,
  onCustomerChange,
  customerRequired,
  paymentMethod,
  onPaymentMethodChange,
  paidAmount,
  onPaidAmountChange,
  totals,
  effectivePaidAmount,
  pendingAmount,
  balanceReturn,
  paymentStatus,
  onGenerateBill,
  isSubmitting,
}) => (
  <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="shrink-0 border-b border-slate-200 px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
          <FiShoppingCart className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Checkout</p>
          <h2 className="text-lg font-bold leading-tight text-slate-900">Billing Screen</h2>
        </div>
      </div>

      <div className="mt-4">
        <form onSubmit={onBarcodeSubmit} className="flex gap-2">
          <input
            ref={barcodeRef}
            type="text"
            value={barcode}
            onChange={(e) => onBarcodeChange(e.target.value)}
            placeholder="Scan barcode (F4)..."
            className="flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
          />
          <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
            Scan
          </button>
        </form>
      </div>

      {selectedBatch && (
        <p className="mt-2 text-xs text-emerald-700">
          Batch: <strong>{selectedBatch.batchNumber}</strong> — add products from the left panel
        </p>
      )}
    </div>

    <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-800">Bill Items ({cart.length})</h3>
        <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${statusStyles[paymentStatus] || 'bg-slate-100 text-slate-600'}`}>
          {paymentStatus}
        </span>
      </div>

      {cart.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">Select products to start billing</p>
      ) : (
        <div className="space-y-3">
          {cart.map((item) => {
            const line = calculateCartLine(item);
            return (
              <div key={item.productId} className="rounded-2xl border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                    <p className="text-xs text-slate-500">
                      Stock: {item.currentStock} · Rate: {formatCurrency(item.sellingPrice)}
                    </p>
                  </div>
                  <button type="button" onClick={() => onRemoveCartItem(item.productId)} className="text-red-500 hover:text-red-700">
                    <FiTrash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => onUpdateCartItem(item.productId, 'quantity', item.quantity - 1)} className="rounded-lg border border-slate-300 p-1.5">
                      <FiMinus className="h-3.5 w-3.5" />
                    </button>
                    <input
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={item.quantity}
                      onChange={(e) => onUpdateCartItem(item.productId, 'quantity', e.target.value)}
                      className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-center text-sm"
                    />
                    <button type="button" onClick={() => onUpdateCartItem(item.productId, 'quantity', item.quantity + 1)} className="rounded-lg border border-slate-300 p-1.5">
                      <FiPlus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="text-sm font-bold text-slate-900">{formatCurrency(line.totalAmount)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>

    {cart.length > 0 && (
      <div className="space-y-4 border-t border-slate-200 bg-slate-50 px-5 py-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Customer Details</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              type="text"
              value={customer.name}
              onChange={(e) => onCustomerChange({ ...customer, name: e.target.value })}
              placeholder={customerRequired ? 'Customer Name *' : 'Customer Name'}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
            <input
              type="tel"
              value={customer.phone}
              onChange={(e) => onCustomerChange({ ...customer, phone: e.target.value })}
              placeholder={customerRequired ? 'WhatsApp Mobile *' : 'WhatsApp Mobile'}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
            <input
              type="text"
              value={customer.village}
              onChange={(e) => onCustomerChange({ ...customer, village: e.target.value })}
              placeholder="Village (optional)"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
            <input
              type="text"
              value={customer.address}
              onChange={(e) => onCustomerChange({ ...customer, address: e.target.value })}
              placeholder="Address (optional)"
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </div>
          <textarea
            value={customer.notes}
            onChange={(e) => onCustomerChange({ ...customer, notes: e.target.value })}
            placeholder="Notes (optional)"
            rows={2}
            className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
          {customerRequired && (
            <p className="mt-2 inline-flex items-center gap-1 text-xs text-amber-700">
              <FiUser className="h-3.5 w-3.5" /> Required for partial or credit bills
            </p>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => onPaymentMethodChange(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            >
              {paymentMethods.map((method) => (
                <option key={method.value} value={method.value}>{method.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600">Paid Amount</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={paymentMethod === 'credit' ? 0 : paidAmount}
              disabled={paymentMethod === 'credit'}
              onChange={(e) => onPaidAmountChange(e.target.value)}
              placeholder={String(totals.grandTotal)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 disabled:bg-slate-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-600">Discount (₹)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={billDiscount}
              onChange={(e) => onBillDiscountChange(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(totals.subtotal)}</span></div>
          <div className="flex justify-between"><span>Discount</span><span>-{formatCurrency(totals.discount)}</span></div>
          <div className="flex justify-between"><span>GST</span><span>{formatCurrency(totals.tax)}</span></div>
          <div className="mt-1 flex justify-between border-t border-slate-200 pt-2 text-base font-bold">
            <span>Grand Total</span><span>{formatCurrency(totals.grandTotal)}</span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg bg-slate-50 p-2"><span className="text-slate-500">Paid</span><p className="font-semibold">{formatCurrency(effectivePaidAmount)}</p></div>
            <div className="rounded-lg bg-slate-50 p-2"><span className="text-slate-500">Pending</span><p className="font-semibold text-amber-700">{formatCurrency(pendingAmount)}</p></div>
            <div className="rounded-lg bg-slate-50 p-2 sm:col-span-2"><span className="text-slate-500">Balance Return</span><p className="font-semibold text-emerald-700">{formatCurrency(balanceReturn)}</p></div>
          </div>
        </div>

        <button
          type="button"
          disabled={cart.length === 0 || isSubmitting}
          onClick={onGenerateBill}
          className="w-full rounded-2xl bg-emerald-600 py-3.5 text-sm font-bold uppercase tracking-wide text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Generating Bill...' : `Generate Bill — ${formatCurrency(totals.grandTotal)}`}
        </button>
        <p className="text-center text-[11px] text-slate-400">Shortcuts: F4 barcode · Ctrl+Enter generate</p>
      </div>
    )}
  </section>
);

export default PosBillingPanel;
