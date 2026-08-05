import { FiPackage, FiSearch } from 'react-icons/fi';
import { formatQuantity } from '../../utils/format';
import LoadingSpinner from '../common/LoadingSpinner';

const StockBatchPanel = ({
  batches,
  batchesLoading,
  selectedBatch,
  onSelectBatch,
  products,
  productsLoading,
  productSearch,
  onProductSearchChange,
  onSelectProduct,
}) => (
  <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    {/* Header */}
    <div className="shrink-0 border-b border-slate-200 px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-emerald-400">
          <FiPackage className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Step 1 · Inventory</p>
          <h2 className="text-base font-bold text-slate-900">Available Stock</h2>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[11px] font-medium text-slate-500">Batch filter</label>
          <select
            value={selectedBatch?.id ?? ''}
            onChange={(e) => {
              const batch = batches.find((b) => String(b.id) === e.target.value);
              onSelectBatch(batch || null);
            }}
            disabled={batchesLoading}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">All products</option>
            {batches.map((batch) => (
              <option key={batch.id} value={batch.id}>
                {batch.batchNumber} — {batch.supplierName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-medium text-slate-500">Search</label>
          <div className="relative">
            <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={productSearch}
              onChange={(e) => onProductSearchChange(e.target.value)}
              placeholder="Product name..."
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>
    </div>

    {/* Product table */}
    <div className="min-h-0 flex-1 overflow-y-auto">
      {productsLoading || batchesLoading ? (
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner />
        </div>
      ) : products.length === 0 ? (
        <p className="px-5 py-20 text-center text-sm text-slate-500">
          {selectedBatch ? 'No products in this batch' : 'No products in stock'}
        </p>
      ) : (
        <>
          <div className="sticky top-0 z-10 grid grid-cols-[minmax(0,1fr)_5rem] gap-x-3 border-b border-slate-200 bg-slate-50 px-5 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            <span>Product Name</span>
            <span className="text-right">In Stock</span>
          </div>

          <div className="divide-y divide-slate-100">
            {products.map((product, index) => (
              <button
                key={product.id}
                type="button"
                onClick={() => onSelectProduct(product)}
                disabled={product.currentStock <= 0}
                className={`grid w-full grid-cols-[minmax(0,1fr)_5rem] items-center gap-x-3 px-5 py-3 text-left transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40 ${
                  index % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'
                }`}
              >
                <span className="truncate text-sm font-medium text-slate-900">{product.name}</span>
                <span className="text-right text-sm font-bold tabular-nums text-emerald-700">
                  {formatQuantity(product.currentStock)}
                </span>
              </button>
            ))}
          </div>

          <p className="border-t border-slate-100 px-5 py-2 text-center text-[10px] text-slate-400">
            {products.length} product{products.length !== 1 ? 's' : ''} · Click to add to bill
          </p>
        </>
      )}
    </div>
  </section>
);

export default StockBatchPanel;
