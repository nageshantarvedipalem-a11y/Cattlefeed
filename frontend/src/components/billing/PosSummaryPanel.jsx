import { useState } from 'react';
import { FiArrowRight, FiClock, FiEdit2, FiMinus, FiPlus, FiShoppingCart, FiTrash2 } from 'react-icons/fi';
import { formatCurrency, formatQuantity } from '../../utils/format';
import PreviousBillsPanel from './PreviousBillsPanel';

const SummaryRow = ({ label, value, bold = false, accent = false }) => (
  <div className={`flex items-center justify-between gap-4 py-1 ${bold ? 'text-base font-bold' : 'text-sm'}`}>
    <span className={bold ? 'text-slate-900' : 'text-slate-600'}>{label}</span>
    <span className={`min-w-[6.5rem] text-right tabular-nums ${accent ? 'text-emerald-700' : bold ? 'text-slate-900' : 'text-slate-800'}`}>
      {value}
    </span>
  </div>
);

const PosSummaryPanel = ({
  barcode,
  onBarcodeChange,
  onBarcodeSubmit,
  barcodeRef,
  cart,
  calculateCartLine,
  onUpdateCartItem,
  onRemoveCartItem,
  onEditCartItem,
  totals,
  onProceed,
}) => {
  const [activeTab, setActiveTab] = useState('current');

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header + tabs */}
      <div className="shrink-0 border-b border-slate-200 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
              {activeTab === 'current' ? <FiShoppingCart className="h-5 w-5" /> : <FiClock className="h-5 w-5" />}
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-600">Step 2</p>
              <h2 className="text-base font-bold text-slate-900">Bill Summary</h2>
            </div>
          </div>
          {activeTab === 'current' && cart.length > 0 && (
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              {cart.length} {cart.length === 1 ? 'item' : 'items'}
            </span>
          )}
        </div>

        <div className="mt-3 flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
          <button
            type="button"
            onClick={() => setActiveTab('current')}
            className={`flex-1 rounded-md px-3 py-2 text-xs font-semibold transition ${
              activeTab === 'current'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Current Bill
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('previous')}
            className={`flex-1 rounded-md px-3 py-2 text-xs font-semibold transition ${
              activeTab === 'previous'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Previous Bills
          </button>
        </div>

        {activeTab === 'current' && (
          <form onSubmit={onBarcodeSubmit} className="mt-3 flex gap-2">
            <input
              ref={barcodeRef}
              type="text"
              value={barcode}
              onChange={(e) => onBarcodeChange(e.target.value)}
              placeholder="Scan barcode (F4)..."
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
            <button
              type="submit"
              className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Scan
            </button>
          </form>
        )}
      </div>

      {activeTab === 'previous' ? (
        <PreviousBillsPanel />
      ) : (
        <>
          {/* Cart items */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-5 py-20 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
                  <FiShoppingCart className="h-7 w-7 text-slate-300" />
                </div>
                <p className="text-sm font-semibold text-slate-700">No items in bill yet</p>
                <p className="mt-1 text-xs text-slate-400">Select products from the left panel</p>
              </div>
            ) : (
              <>
                <div className="sticky top-0 z-10 grid grid-cols-[minmax(0,1fr)_4.5rem_5.5rem_5.5rem] gap-x-2 border-b border-slate-200 bg-slate-50 px-5 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  <span>Product</span>
                  <span className="text-center">Qty</span>
                  <span className="text-right">Rate</span>
                  <span className="text-right">Amount</span>
                </div>

                <div className="divide-y divide-slate-100">
                  {cart.map((item, index) => {
                    const line = calculateCartLine(item);
                    return (
                      <div
                        key={item.productId}
                        className={`px-5 py-3 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}`}
                      >
                        <div className="grid grid-cols-[minmax(0,1fr)_4.5rem_5.5rem_5.5rem] items-center gap-x-2">
                          <p className="truncate text-sm font-medium text-slate-900" title={item.name}>
                            {item.name}
                          </p>
                          <div className="flex items-center justify-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => onUpdateCartItem(item.productId, 'quantity', item.quantity - 1)}
                              className="rounded border border-slate-300 bg-white p-0.5 text-slate-600 hover:bg-slate-100"
                              title="Decrease"
                            >
                              <FiMinus className="h-3 w-3" />
                            </button>
                            <span className="min-w-[1.75rem] text-center text-xs font-bold tabular-nums text-slate-800">
                              {formatQuantity(item.quantity)}
                            </span>
                            <button
                              type="button"
                              onClick={() => onUpdateCartItem(item.productId, 'quantity', item.quantity + 1)}
                              className="rounded border border-slate-300 bg-white p-0.5 text-slate-600 hover:bg-slate-100"
                              title="Increase"
                            >
                              <FiPlus className="h-3 w-3" />
                            </button>
                          </div>
                          <span className="text-right text-xs tabular-nums text-slate-600">
                            {formatCurrency(item.sellingPrice)}
                          </span>
                          <span className="text-right text-sm font-bold tabular-nums text-slate-900">
                            {formatCurrency(line.totalAmount)}
                          </span>
                        </div>

                        <div className="mt-2 flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onEditCartItem(item)}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                          >
                            <FiEdit2 className="h-3 w-3" /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => onRemoveCartItem?.(item.productId)}
                            className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600 hover:bg-red-100"
                          >
                            <FiTrash2 className="h-3 w-3" /> Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Totals + proceed */}
          <div className="shrink-0 border-t border-slate-200 bg-slate-50">
            {cart.length > 0 && (
              <div className="space-y-1 border-b border-slate-200 px-5 py-3">
                <SummaryRow label="Subtotal" value={formatCurrency(totals.subtotal)} />
                <SummaryRow label="GST" value={formatCurrency(totals.tax)} />
                {totals.discount > 0 && (
                  <SummaryRow label="Discount" value={`-${formatCurrency(totals.discount)}`} />
                )}
                <div className="border-t border-slate-300 pt-2">
                  <SummaryRow label="Grand Total" value={formatCurrency(totals.grandTotal)} bold accent />
                </div>
              </div>
            )}

            <div className="px-5 py-3">
              <button
                type="button"
                disabled={cart.length === 0}
                onClick={onProceed}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-sm font-bold uppercase tracking-wide text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Proceed to Bill
                <FiArrowRight className="h-4 w-4" />
              </button>
              <p className="mt-1.5 text-center text-[10px] text-slate-400">
                Next: customer &amp; payment details
              </p>
            </div>
          </div>
        </>
      )}
    </section>
  );
};

export default PosSummaryPanel;
