import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FiAlertTriangle,
  FiDownload,
  FiEye,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiDollarSign,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import stockService from '../../services/stockService';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatPaymentStatus, formatQuantity } from '../../utils/format';
import { catalogLabel } from '../../utils/catalogI18n';
import { downloadBlob, getExportFilename } from '../../utils/download';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PeriodFilter from '../../components/common/PeriodFilter';
import usePeriodFilter from '../../hooks/usePeriodFilter';
import PurchaseFormModal from '../../components/stock/PurchaseFormModal';
import AdjustmentFormModal from '../../components/stock/AdjustmentFormModal';
import PurchasePayModal from '../../components/stock/PurchasePayModal';

const movementBadge = {
  in: 'bg-emerald-100 text-emerald-700',
  out: 'bg-red-100 text-red-700',
  adjustment: 'bg-amber-100 text-amber-700',
};

const StockPage = () => {
  const { t } = useTranslation();
  const { checkPermission } = useAuth();
  const tabs = useMemo(() => [
    { id: 'purchases', label: t('stock.tabStockIn') },
    { id: 'history', label: t('stock.tabHistory') },
    { id: 'lowStock', label: t('stock.tabLowStock') },
  ], [t]);
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
  const [payPurchase, setPayPurchase] = useState(null);

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
      toast.error(error.response?.data?.message || t('stock.loadPurchasesFailed'));
    } finally {
      setLoading(false);
    }
  }, [page, limit, search]);

  const fetchHistory = useCallback(async () => {
    if (!isReady) {
      setLoading(false);
      if (!isCustomPending && isInvalidRange) {
        toast.error(t('common.dateFromAfterTo'));
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
      toast.error(error.response?.data?.message || t('stock.loadHistoryFailed'));
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
      toast.error(error.response?.data?.message || t('stock.loadLowStockFailed'));
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
      toast.error(error.response?.data?.message || t('stock.loadPurchaseDetailsFailed'));
    } finally {
      setDetailLoading(false);
    }
  };

  const handleExportHistory = async (format) => {
    if (!isReady) {
      toast.error(isCustomPending ? t('common.selectCustomDates') : t('common.invalidDateRange'));
      return;
    }
    try {
      const response = await stockService.exportHistory({
        format,
        search,
        ...apiParams,
      });
      downloadBlob(response.data, getExportFilename(response, `stock-history.${format === 'pdf' ? 'pdf' : 'xlsx'}`));
      toast.success(t('common.stockHistoryExportedAs', { format: format.toUpperCase() }));
    } catch (error) {
      toast.error(error.response?.data?.message || t('common.exportFailed'));
    }
  };

  const handleExportLowStock = async (format) => {
    try {
      const response = await stockService.exportLowStock({ format });
      downloadBlob(response.data, getExportFilename(response, `low-stock.${format === 'pdf' ? 'pdf' : 'xlsx'}`));
      toast.success(t('common.lowStockExportedAs', { format: format.toUpperCase() }));
    } catch (error) {
      toast.error(error.response?.data?.message || t('common.exportFailed'));
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('stock.managementTitle')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('stock.managementSubtitle')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <button
              type="button"
              onClick={() => setAdjustmentModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <FiRefreshCw className="h-4 w-4" />
              {t('stock.adjustStock')}
            </button>
          )}
          {canCreate && activeTab === 'purchases' && (
            <button
              type="button"
              onClick={() => setPurchaseModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
            >
              <FiPlus className="h-4 w-4" />
              {t('stock.newStockIn')}
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
            placeholder={activeTab === 'purchases' ? t('stock.searchPurchases') : t('stock.searchHistory')}
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
              <FiDownload className="h-4 w-4" /> {t('common.excel')}
            </button>
            <button type="button" onClick={() => handleExportHistory('pdf')} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
              <FiDownload className="h-4 w-4" /> {t('common.pdf')}
            </button>
          </div>
        )}

        {activeTab === 'lowStock' && (
          <div className="flex gap-2">
            <button type="button" onClick={() => handleExportLowStock('excel')} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
              <FiDownload className="h-4 w-4" /> {t('common.excel')}
            </button>
            <button type="button" onClick={() => handleExportLowStock('pdf')} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
              <FiDownload className="h-4 w-4" /> {t('common.pdf')}
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
                      {[
                        t('common.invoice'),
                        t('common.date'),
                        t('common.supplier'),
                        t('stock.colItems'),
                        t('common.total'),
                        t('common.paid'),
                        t('common.status'),
                        t('common.actions'),
                      ].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {purchases.length === 0 ? (
                      <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-500">{t('stock.noStockIn')}</td></tr>
                    ) : (
                      purchases.map((purchase) => (
                        <tr key={purchase.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm font-medium">{purchase.invoiceNumber}</td>
                          <td className="px-4 py-3 text-sm">{new Date(purchase.purchaseDate).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-sm">{catalogLabel(purchase.supplierName, 'suppliers')}</td>
                          <td className="px-4 py-3 text-sm">{purchase.itemCount}</td>
                          <td className="px-4 py-3 text-sm font-medium">{formatCurrency(purchase.totalAmount)}</td>
                          <td className="px-4 py-3 text-sm">{formatCurrency(purchase.paidAmount)}</td>
                          <td className="px-4 py-3 text-sm">{formatPaymentStatus(purchase.paymentStatus, purchase.paidAmount)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleViewPurchase(purchase.id)}
                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-primary-700"
                                title={t('common.viewDetails')}
                              >
                                <FiEye className="h-4 w-4" />
                              </button>
                              {canEdit && Number(purchase.totalAmount) > Number(purchase.paidAmount) && (
                                <button
                                  type="button"
                                  onClick={() => setPayPurchase(purchase)}
                                  className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-800"
                                  title={t('stock.payPurchase')}
                                >
                                  <FiDollarSign className="h-4 w-4" />
                                </button>
                              )}
                            </div>
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
                      {[
                        t('common.date'),
                        t('common.product'),
                        t('common.type'),
                        t('common.quantity'),
                        t('common.balance'),
                        t('common.reference'),
                        t('common.remarks'),
                      ].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {isCustomPending ? (
                      <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">{t('common.selectCustomDates')}</td></tr>
                    ) : movements.length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">{t('stock.noMovements')}</td></tr>
                    ) : (
                      movements.map((movement) => (
                        <tr key={movement.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm">{new Date(movement.createdAt).toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm">
                            <p className="font-medium">{catalogLabel(movement.productName, 'names')}</p>
                            <p className="text-xs text-slate-500">{movement.productSku}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2 py-1 text-xs font-medium uppercase ${movementBadge[movement.movementType] || 'bg-slate-100 text-slate-700'}`}>
                              {movement.movementType === 'in'
                                ? t('common.movementIn')
                                : movement.movementType === 'out'
                                  ? t('common.movementOut')
                                  : movement.movementType === 'adjustment'
                                    ? t('common.movementAdjustment')
                                    : movement.movementType}
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
                      {[
                        t('common.product'),
                        t('products.sku'),
                        t('common.category'),
                        t('common.currentStock'),
                        t('common.minStock'),
                        t('common.sellingPrice'),
                      ].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase text-slate-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lowStockProducts.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-500">{t('stock.noLowStockHealthy')}</td></tr>
                    ) : (
                      lowStockProducts.map((product) => (
                        <tr key={product.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <FiAlertTriangle className="h-4 w-4 text-amber-500" />
                              <span className="font-medium text-slate-900">{catalogLabel(product.name, 'names')}</span>
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

      <Modal isOpen={purchaseModalOpen} onClose={() => setPurchaseModalOpen(false)} title={t('stock.newStockInEntry')} size="xl">
        <PurchaseFormModal isOpen={purchaseModalOpen} onClose={() => setPurchaseModalOpen(false)} onSuccess={refresh} />
      </Modal>

      <Modal isOpen={adjustmentModalOpen} onClose={() => setAdjustmentModalOpen(false)} title={t('stock.manualAdjustment')} size="md">
        <AdjustmentFormModal isOpen={adjustmentModalOpen} onClose={() => setAdjustmentModalOpen(false)} onSuccess={refresh} />
      </Modal>

      <Modal
        isOpen={Boolean(detailPurchase) || detailLoading}
        onClose={() => { setDetailPurchase(null); setDetailLoading(false); }}
        title={t('stock.purchaseDetails')}
        size="lg"
      >
        {detailLoading ? (
          <div className="py-8"><LoadingSpinner /></div>
        ) : detailPurchase && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <div><span className="text-slate-500">{t('common.invoice')}:</span> <strong>{detailPurchase.invoiceNumber}</strong></div>
              <div><span className="text-slate-500">{t('common.date')}:</span> {new Date(detailPurchase.purchaseDate).toLocaleDateString()}</div>
              <div><span className="text-slate-500">{t('common.supplier')}:</span> {catalogLabel(detailPurchase.supplierName, 'suppliers')}</div>
              <div><span className="text-slate-500">{t('common.status')}:</span> {formatPaymentStatus(detailPurchase.paymentStatus, detailPurchase.paidAmount)}</div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {[
                      t('common.product'),
                      t('common.quantity'),
                      t('stock.purchasePrice'),
                      t('products.colSelling'),
                      t('products.gstRate'),
                      t('common.total'),
                    ].map((h) => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-semibold uppercase text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {detailPurchase.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-2">{catalogLabel(item.productName, 'names')}</td>
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
              <div className="flex justify-between"><span>{t('common.subtotal')}</span><span>{formatCurrency(detailPurchase.subtotal)}</span></div>
              <div className="flex justify-between"><span>{t('common.tax')}</span><span>{formatCurrency(detailPurchase.taxAmount)}</span></div>
              <div className="flex justify-between"><span>{t('common.paid')}</span><span>{formatCurrency(detailPurchase.paidAmount)}</span></div>
              <div className="flex justify-between text-amber-700"><span>{t('common.pending')}</span><span>{formatCurrency(detailPurchase.pendingAmount ?? (detailPurchase.totalAmount - detailPurchase.paidAmount))}</span></div>
              <div className="flex justify-between font-semibold"><span>{t('common.total')}</span><span>{formatCurrency(detailPurchase.totalAmount)}</span></div>
            </div>
            {canEdit && Number(detailPurchase.totalAmount) > Number(detailPurchase.paidAmount) && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setPayPurchase(detailPurchase);
                    setDetailPurchase(null);
                  }}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  <FiDollarSign className="h-4 w-4" />
                  {t('stock.payPurchase')}
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <PurchasePayModal
        isOpen={Boolean(payPurchase)}
        purchase={payPurchase}
        onClose={() => setPayPurchase(null)}
        onSuccess={refresh}
      />
    </div>
  );
};

export default StockPage;
