import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { FiAlertTriangle, FiArrowLeft, FiBox, FiTag } from 'react-icons/fi';
import toast from 'react-hot-toast';
import productService from '../../services/productService';
import stockService from '../../services/stockService';
import { formatCurrency, formatDate, formatQuantity, formatStatusLabel } from '../../utils/format';
import { catalogLabel } from '../../utils/catalogI18n';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const statusStyles = {
  active: 'bg-emerald-100 text-emerald-700',
  inactive: 'bg-slate-100 text-slate-700',
  discontinued: 'bg-red-100 text-red-700',
};

const ProductDetailPage = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState(null);
  const [movements, setMovements] = useState([]);

  const fetchProduct = useCallback(async () => {
    setLoading(true);
    try {
      const [productRes, historyRes] = await Promise.all([
        productService.getProduct(id),
        stockService.getProductHistory(id, { page: 1, limit: 20 }),
      ]);
      setProduct(productRes.data.data.product);
      setMovements(historyRes.data.data.movements);
    } catch (error) {
      toast.error(error.response?.data?.message || t('products.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!product) {
    return (
      <div className="py-12 text-center">
        <p className="text-slate-500">{t('products.notFound')}</p>
        <Link to="/products" className="mt-4 inline-block text-primary-700 hover:underline">
          {t('products.backToProducts')}
        </Link>
      </div>
    );
  }

  const margin = product.sellingPrice - product.purchasePrice;
  const marginPercent = product.purchasePrice > 0
    ? ((margin / product.purchasePrice) * 100).toFixed(1)
    : '—';

  return (
    <div>
      <Link to="/products" className="mb-4 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-primary-700">
        <FiArrowLeft /> {t('products.backToProducts')}
      </Link>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <FiBox className="h-5 w-5 text-slate-400" />
              <h1 className="text-2xl font-bold text-slate-900">
                {catalogLabel(product.name, 'names')}
              </h1>
            </div>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-600">
              <span>{t('products.sku')}: <strong>{product.sku}</strong></span>
              {product.barcode && (
                <span>{t('products.barcode')}: <strong>{product.barcode}</strong></span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-500">
              {product.categoryName && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1">
                  <FiTag className="h-3.5 w-3.5" /> {catalogLabel(product.categoryName, 'categories')}
                </span>
              )}
              {product.brandName && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1">
                  {t('products.brandLabel')}: {catalogLabel(product.brandName, 'brands')}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <span className={`rounded-full px-3 py-1 text-sm font-medium ${statusStyles[product.status] || statusStyles.inactive}`}>
              {formatStatusLabel(product.status)}
            </span>
            {product.isLowStock && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700">
                <FiAlertTriangle className="h-4 w-4" /> {t('products.lowStockAlert')}
              </span>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs text-slate-500">{t('products.purchasePrice')}</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{formatCurrency(product.purchasePrice)}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs text-slate-500">{t('products.sellingPrice')}</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{formatCurrency(product.sellingPrice)}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs text-slate-500">{t('products.gstRate')}</p>
            <p className="mt-1 text-lg font-bold text-slate-900">{product.gstRate}%</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs text-slate-500">{t('products.margin')}</p>
            <p className="mt-1 text-lg font-bold text-emerald-700">
              {formatCurrency(margin)}
              {marginPercent !== '—' && <span className="ml-1 text-sm font-normal text-slate-500">({marginPercent}%)</span>}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className={`rounded-lg p-4 ${product.isLowStock ? 'bg-amber-50' : 'bg-emerald-50'}`}>
            <p className="text-xs text-slate-500">{t('products.currentStock')}</p>
            <p className={`mt-1 text-2xl font-bold ${product.isLowStock ? 'text-amber-700' : 'text-emerald-700'}`}>
              {formatQuantity(product.currentStock)}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 p-4">
            <p className="text-xs text-slate-500">{t('products.minimumStock')}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{formatQuantity(product.minStock)}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="font-semibold text-slate-900">{t('products.stockHistory')}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {[
                  t('common.date'),
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
              {movements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-500">
                    {t('common.noData')}
                  </td>
                </tr>
              ) : (
                movements.map((movement) => (
                  <tr key={movement.id}>
                    <td className="px-4 py-3 text-sm">{formatDate(movement.createdAt)}</td>
                    <td className="px-4 py-3 text-sm uppercase">{movement.movementType}</td>
                    <td className="px-4 py-3 text-sm">{formatQuantity(movement.quantity)}</td>
                    <td className="px-4 py-3 text-sm">{formatQuantity(movement.balanceAfter)}</td>
                    <td className="px-4 py-3 text-sm capitalize">
                      {movement.referenceType}{movement.referenceId ? ` #${movement.referenceId}` : ''}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{movement.remarks || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
