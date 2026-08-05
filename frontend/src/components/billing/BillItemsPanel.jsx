import { FiEdit2, FiFileText, FiMinus, FiPlus, FiTrash2 } from 'react-icons/fi';
import { formatCurrency, formatQuantity } from '../../utils/format';

const BillItemsPanel = ({
  cart,
  calculateCartLine,
  onUpdateCartItem,
  onRemoveCartItem,
  onEditCartItem,
}) => (
  <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="shrink-0 border-b border-slate-200 px-4 py-3">
      <div className="flex items-center gap-2">
        <FiFileText className="h-4 w-4 text-emerald-600" />
        <h3 className="text-sm font-bold text-slate-900">Current Bill ({cart.length})</h3>
      </div>
    </div>

    <div className="min-h-0 flex-1 overflow-y-auto p-3">
      {cart.length === 0 ? (
        <p className="py-8 text-center text-xs text-slate-500">
          Added products will appear here
        </p>
      ) : (
        <div className="space-y-2">
          {cart.map((item) => {
            const line = calculateCartLine(item);
            return (
              <div key={item.productId} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{item.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatQuantity(item.quantity)} × {formatCurrency(item.sellingPrice)}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-bold text-slate-900">{formatCurrency(line.totalAmount)}</p>
                </div>

                <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-200/80 pt-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onUpdateCartItem(item.productId, 'quantity', item.quantity - 1)}
                      className="rounded-lg border border-slate-300 bg-white p-1"
                      title="Decrease"
                    >
                      <FiMinus className="h-3.5 w-3.5" />
                    </button>
                    <span className="min-w-[2.5rem] text-center text-sm font-medium">{formatQuantity(item.quantity)}</span>
                    <button
                      type="button"
                      onClick={() => onUpdateCartItem(item.productId, 'quantity', item.quantity + 1)}
                      className="rounded-lg border border-slate-300 bg-white p-1"
                      title="Increase"
                    >
                      <FiPlus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onEditCartItem(item)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      <FiEdit2 className="h-3.5 w-3.5" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveCartItem?.(item.productId);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
                    >
                      <FiTrash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  </section>
);

export default BillItemsPanel;
