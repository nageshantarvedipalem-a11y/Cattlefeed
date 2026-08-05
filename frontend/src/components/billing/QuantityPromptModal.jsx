import { useEffect, useRef, useState } from 'react';
import { FiPackage } from 'react-icons/fi';
import { formatQuantity } from '../../utils/format';

const QuantityPromptModal = ({ product, onConfirm, onClose, editMode = false, initialQuantity }) => {
  const [quantity, setQuantity] = useState(String(initialQuantity ?? 1));
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  if (!product) return null;

  const maxQty = Number(product.currentStock) || 0;

  const handleSubmit = (event) => {
    event.preventDefault();
    const qty = Number(quantity);
    if (!qty || qty <= 0) return;
    if (qty > maxQty) return;
    onConfirm(product, qty);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <FiPackage className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-slate-400">{editMode ? 'Update item' : 'Add to bill'}</p>
            <h3 className="truncate font-bold text-slate-900">{product.name}</h3>
          </div>
        </div>

        <p className="mb-4 text-sm text-slate-600">
          Available quantity: <strong>{formatQuantity(maxQty)}</strong>
        </p>

        <label className="mb-1 block text-xs font-medium text-slate-600">
          Enter quantity to sell *
        </label>
        <input
          ref={inputRef}
          type="number"
          step="0.001"
          min="0.001"
          max={maxQty}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-lg font-semibold outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        />

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!quantity || Number(quantity) <= 0 || Number(quantity) > maxQty}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {editMode ? 'Update Quantity' : 'Add to Bill'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default QuantityPromptModal;
