import { useCallback, useEffect, useState } from 'react';
import {
  FiAlertTriangle,
  FiDownload,
  FiEye,
  FiPlus,
  FiRefreshCw,
  FiSearch,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import stockService from '../../services/stockService';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatQuantity } from '../../utils/format';
import { downloadBlob, getExportFilename } from '../../utils/download';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PeriodFilter from '../../components/common/PeriodFilter';
import usePeriodFilter from '../../hooks/usePeriodFilter';
import PurchaseFormModal from '../../components/stock/PurchaseFormModal';
import AdjustmentFormModal from '../../components/stock/AdjustmentFormModal';

const tabs = [
  { id: 'purchases', label: 'Stock In' },
  { id: 'history', label: 'Stock History' },
  { id: 'lowStock', label: 'Low Stock' },
];

const movementBadge = {
  in: 'bg-emerald-100 text-emerald-700',
  out: 'bg-red-100 text-red-700',
  adjustment: 'bg-amber-100 text-amber-700',
};

const StockPage = () => {
  const { checkPermission } = useAuth();
  const [activeTab, setActiveTab] = useState('purchases');

  const canCreate = checkPermission('stock', 'create');
  const canEdit = checkPermission('stock', 'edit');

  const [purchases, setPurchases] = useState([]);
  const [movements, setMovements] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const {
    period,
    setPeriod,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    apiParams,
    isReady,
    isCustomPending,
    isInvalidRange,
  } = usePeriodFilter('');
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [adjustmentModalOpen, setAdjustmentModalOpen] = useState(false);
  const [detailPurchase, setDetailPurchase] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const fetchPurchases = useCallback(async () => {
    setLoading(true);
    try {
      const response = await stockService.getPurchases({ page, limit, search });
      setPurchases(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load purchases');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search]);

  const fetchHistory = useCallback(async () => {
    if (!isReady) {
      setLoading(false);
      if (!isCustomPending && isInvalidRange) {
        toast.error('From date cannot be after To date');
      }
      return;
    }

    setLoading(true);
    try {
      const response = await stockService.getHistory({
        page,
        limit,
        search,
        ...apiParams,
      });
      setMovements(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load stock history');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, apiParams, isReady, isCustomPending, isInvalidRange]);

  const fetchLowStock = useCallback(async () => {
    setLoading(true);
    try {
      const response = await stockService.getLowStock({ page, limit, search });
      setLowStockProducts(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load low stock products');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search]);

  useEffect(() => {
    if (activeTab === 'purchases') fetchPurchases();
    else if (activeTab === 'history') fetchHistory();
    else fetchLowStock();
  }, [activeTab, fetchPurchases, fetchHistory, fetchLowStock]);

  const refresh = () => {
    if (activeTab === 'purchases') fetchPurchases();
    else if (activeTab === 'history') fetchHistory();
    else fetchLowStock();
  };

  const handleViewPurchase = async (purchaseId) => {
    setDetailLoading(true);
    setDetailPurchase(null);
    try {
      const response = await stockService.getPurchase(purchaseId);
      setDetailPurchase(response.data.data.purchase);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load purchase details');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleExportHistory = async (format) => {
    if (!isReady) {
      toast.error(isCustomPending ? 'Select from and to dates for custom range' : 'Invalid date range');
      return;
    }
    try {
      const response = await stockService.exportHistory({
        format,
        search,
        ...apiParams,
      });
      downloadBlob(response.data, getExportFilename(response, `stock-history.${format === 'pdf' ? 'pdf' : 'xlsx'}`));
      toast.success(`Stock history exported as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Export failed');
    }
  };

  const handleExportLowStock = async (format) => {
    try {
      const response = await stockService.exportLowStock({ format });
      downloadBlob(response.data, getExportFilename(response, `low-stock.${format === 'pdf' ? 'pdf' : 'xlsx'}`));
      toast.success(`Low stock report exported as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Export failed');
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Stock Management</h1>
          <p className="mt-1 text-sm text-slate-500">Stock-in entries, movement history, and low stock alerts</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <button
              type="button"
              onClick={() => setAdjustmentModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <FiRefreshCw className="h-4 w-4" />
              Adjust Stock
            </button>
          )}
          {canCreate && activeTab === 'purchases' && (
            <button
              type="button"
              onClick={() => setPurchaseModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
            >
              <FiPlus className="h-4 w-4" />
              New Stock In
            </button>
          )}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => { setActiveTab(tab.id); setPage(1); }}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition ${
              activeTab === tab.id
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={activeTab === 'purchases' ? 'Search invoice, supplier...' : 'Search product, SKU, remarks...'}
            className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          />
        </div>

        {activeTab === 'history' && (
          <div className="flex flex-wrap gap-2">
            <PeriodFilter
              period={period}
              onPeriodChange={(v) => { setPeriod(v); setPage(1); }}
              dateFrom={dateFrom}
              onDateFromChange={(v) => { setDateFrom(v); setPage(1); }}
              dateTo={dateTo}
              onDateToChange={(v) => { setDateTo(v); setPage(1); }}
            />
            <button type="button" onClick={() => handleExportHistory('excel')} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
              <FiDownload className="h-4 w-4" /> Excel
            </button>
            <button type="button" onClick={() => handleExportHistory('pdf')} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
              <FiDownload className="h-4 w-4" /> PDF
            </button>
          </div>
        )}

        {activeTab === 'lowStock' && (
          <div className="flex gap-2">
            <button type="button" onClick={() => handleExportLowStock('excel')} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
              <FiDownload className="h-4 w-4" /> Excel
            </button>
            <button type="button" onClick={() => handleExportLowStock('pdf')} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
              <FiDownload className="h-4 w-4" /> PDF
            </button>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="py-16"><LoadingSpinner /></div>
        ) : (
          <>
            {activeTab === 'purchases' && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      {['Invoice', 'Date', 'Supplier', 'Items', 'Total', 'Paid', 'Status', 'Actions'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {purchases.length === 0 ? (
                      <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-500">No stock-in entries found</td></tr>
                    ) : (
                      purchases.map((purchase) => (
                        <tr key={purchase.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm font-medium">{purchase.invoiceNumber}</td>
                          <td className="px-4 py-3 text-sm">{new Date(purchase.purchaseDate).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-sm">{purchase.supplierName}</td>
                          <td className="px-4 py-3 text-sm">{purchase.itemCount}</td>
                          <td className="px-4 py-3 text-sm font-medium">{formatCurrency(purchase.totalAmount)}</td>
                          <td className="px-4 py-3 text-sm">{formatCurrency(purchase.paidAmount)}</td>
                          <td className="px-4 py-3 text-sm capitalize">{purchase.paymentStatus}</td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => handleViewPurchase(purchase.id)}
                              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-primary-700"
                              title="View details"
                            >
                              <FiEye className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      {['Date', 'Product', 'Type', 'Quantity', 'Balance', 'Reference', 'Remarks'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isCustomPending ? (
                      <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">Select from and to dates for custom range</td></tr>
                    ) : movements.length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">No stock movements found</td></tr>
                    ) : (
                      movements.map((movement) => (
                        <tr key={movement.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm">{new Date(movement.createdAt).toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm">
                            <p className="font-medium">{movement.productName}</p>
                            <p className="text-xs text-slate-500">{movement.productSku}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2 py-1 text-xs font-medium uppercase ${movementBadge[movement.movementType] || 'bg-slate-100 text-slate-700'}`}>
                              {movement.movementType}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">{formatQuantity(movement.quantity)}</td>
                          <td className="px-4 py-3 text-sm">{formatQuantity(movement.balanceAfter)}</td>
                          <td className="px-4 py-3 text-sm capitalize">{movement.referenceType}{movement.referenceId ? ` #${movement.referenceId}` : ''}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{movement.remarks || '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'lowStock' && (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr>
                      {['Product', 'SKU', 'Category', 'Current Stock', 'Min Stock', 'Selling Price'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lowStockProducts.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-500">No low stock products — all levels are healthy</td></tr>
                    ) : (
                      lowStockProducts.map((product) => (
                        <tr key={product.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <FiAlertTriangle className="h-4 w-4 text-amber-500" />
                              <span className="font-medium text-slate-900">{product.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm">{product.sku}</td>
                          <td className="px-4 py-3 text-sm">{product.categoryName || '—'}</td>
                          <td className="px-4 py-3 text-sm font-medium text-amber-700">{formatQuantity(product.currentStock)}</td>
                          <td className="px-4 py-3 text-sm">{formatQuantity(product.minStock)}</td>
                          <td className="px-4 py-3 text-sm">{formatCurrency(product.sellingPrice)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <Pagination page={page} totalPages={pagination.totalPages} total={pagination.total} limit={limit} onPageChange={setPage} />
          </>
        )}
      </div>

      <Modal isOpen={purchaseModalOpen} onClose={() => setPurchaseModalOpen(false)} title="New Stock In Entry" size="xl">
        <PurchaseFormModal isOpen={purchaseModalOpen} onClose={() => setPurchaseModalOpen(false)} onSuccess={refresh} />
      </Modal>

      <Modal isOpen={adjustmentModalOpen} onClose={() => setAdjustmentModalOpen(false)} title="Manual Stock Adjustment" size="md">
        <AdjustmentFormModal isOpen={adjustmentModalOpen} onClose={() => setAdjustmentModalOpen(false)} onSuccess={refresh} />
      </Modal>

      <Modal
        isOpen={Boolean(detailPurchase) || detailLoading}
        onClose={() => { setDetailPurchase(null); setDetailLoading(false); }}
        title="Purchase Details"
        size="lg"
      >
        {detailLoading ? (
          <div className="py-8"><LoadingSpinner /></div>
        ) : detailPurchase && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <div><span className="text-slate-500">Invoice:</span> <strong>{detailPurchase.invoiceNumber}</strong></div>
              <div><span className="text-slate-500">Date:</span> {new Date(detailPurchase.purchaseDate).toLocaleDateString()}</div>
              <div><span className="text-slate-500">Supplier:</span> {detailPurchase.supplierName}</div>
              <div><span className="text-slate-500">Status:</span> <span className="capitalize">{detailPurchase.paymentStatus}</span></div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {['Product', 'Qty', 'Purchase', 'Selling', 'GST', 'Total'].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {detailPurchase.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-2">{item.productName}</td>
                      <td className="px-3 py-2">{formatQuantity(item.quantity)}</td>
                      <td className="px-3 py-2">{formatCurrency(item.purchasePrice)}</td>
                      <td className="px-3 py-2">{formatCurrency(item.sellingPrice)}</td>
                      <td className="px-3 py-2">{item.gstRate}%</td>
                      <td className="px-3 py-2">{formatCurrency(item.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="rounded-lg bg-slate-50 p-4 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(detailPurchase.subtotal)}</span></div>
              <div className="flex justify-between"><span>Tax</span><span>{formatCurrency(detailPurchase.taxAmount)}</span></div>
              <div className="flex justify-between font-semibold"><span>Total</span><span>{formatCurrency(detailPurchase.totalAmount)}</span></div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default StockPage;
