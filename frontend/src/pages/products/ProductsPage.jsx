import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  FiAlertTriangle,
  FiBox,
  FiEdit2,
  FiEye,
  FiPlus,
  FiSearch,
  FiTrash2,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import productService from '../../services/productService';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatQuantity, formatStatusLabel } from '../../utils/format';
import { catalogLabel } from '../../utils/catalogI18n';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ProductFormModal from '../../components/products/ProductFormModal';

const statusStyles = {
  active: 'bg-emerald-100 text-emerald-700',
  inactive: 'bg-slate-100 text-slate-700',
  discontinued: 'bg-red-100 text-red-700',
};

const ProductsPage = () => {
  const { t } = useTranslation();
  const { checkPermission } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const canCreate = checkPermission('products', 'create');
  const canEdit = checkPermission('products', 'edit');
  const canDelete = checkPermission('products', 'delete');

  const fetchMeta = useCallback(async () => {
    try {
      const response = await productService.getProductMeta();
      setCategories(response.data.data.categories);
      setBrands(response.data.data.brands);
    } catch {
      // Non-blocking for list page
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await productService.getProducts({
        page,
        limit,
        search,
        categoryId: categoryFilter || undefined,
        brandId: brandFilter || undefined,
        status: statusFilter || undefined,
        lowStock: lowStockFilter || undefined,
        sortBy,
        sortOrder,
      });
      setProducts(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.error(error.response?.data?.message || t('products.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, categoryFilter, brandFilter, statusFilter, lowStockFilter, sortBy, sortOrder, t]);

  useEffect(() => {
    fetchMeta();
  }, [fetchMeta]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const handleDelete = async (product) => {
    const displayName = catalogLabel(product.name, 'names');
    if (!window.confirm(t('products.deleteConfirm', { name: displayName, sku: product.sku }))) return;
    try {
      await productService.deleteProduct(product.id);
      toast.success(t('products.deleted'));
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.message || t('products.deleteFailed'));
    }
  };

  const sortIndicator = (column) => (sortBy === column ? (sortOrder === 'asc' ? ' ↑' : ' ↓') : '');

  const columns = [
    { key: 'name', label: t('products.colProduct') },
    { key: 'categoryName', label: t('products.colCategory') },
    { key: 'brandName', label: t('products.colBrand') },
    { key: 'purchasePrice', label: t('products.colPurchase') },
    { key: 'sellingPrice', label: t('products.colSelling') },
    { key: 'currentStock', label: t('products.colStock') },
    { key: 'status', label: t('products.colStatus') },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('products.title')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('products.subtitle')}</p>
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={() => { setEditingProduct(null); setModalOpen(true); }}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
          >
            <FiPlus className="h-4 w-4" />
            {t('products.addProduct')}
          </button>
        )}
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative lg:col-span-2">
          <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t('products.searchPlaceholder')}
            className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-primary-500"
        >
          <option value="">{t('products.allCategories')}</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {catalogLabel(category.name, 'categories')}
            </option>
          ))}
        </select>

        <select
          value={brandFilter}
          onChange={(e) => { setBrandFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-primary-500"
        >
          <option value="">{t('products.allBrands')}</option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {catalogLabel(brand.name, 'brands')}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-primary-500"
        >
          <option value="">{t('products.allStatus')}</option>
          <option value="active">{t('common.active')}</option>
          <option value="inactive">{t('common.inactive')}</option>
          <option value="discontinued">{t('common.discontinued')}</option>
        </select>
      </div>

      <div className="mb-4">
        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={lowStockFilter === 'true'}
            onChange={(e) => {
              setLowStockFilter(e.target.checked ? 'true' : '');
              setPage(1);
            }}
            className="rounded border-slate-300 text-primary-600"
          />
          {t('products.showLowStockOnly')}
        </label>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="py-16"><LoadingSpinner /></div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        onClick={() => handleSort(col.key)}
                        className="cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-700"
                      >
                        {col.label}{sortIndicator(col.key)}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {t('common.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-500">
                        {t('products.noProducts')}
                      </td>
                    </tr>
                  ) : (
                    products.map((product) => (
                      <tr key={product.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <FiBox className="h-4 w-4 text-slate-400" />
                            <div>
                              <p className="font-medium text-slate-900">
                                {catalogLabel(product.name, 'names')}
                              </p>
                              <p className="text-xs text-slate-500">
                                {t('products.sku')}: {product.sku}
                              </p>
                              {product.isLowStock && (
                                <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-amber-600">
                                  <FiAlertTriangle className="h-3 w-3" /> {t('products.lowStock')}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {catalogLabel(product.categoryName, 'categories')}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {catalogLabel(product.brandName, 'brands')}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">{formatCurrency(product.purchasePrice)}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{formatCurrency(product.sellingPrice)}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {formatQuantity(product.currentStock)}
                          <span className="block text-xs text-slate-500">
                            {t('products.min')}: {formatQuantity(product.minStock)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[product.status] || statusStyles.inactive}`}>
                            {formatStatusLabel(product.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              to={`/products/${product.id}`}
                              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-primary-700"
                              title={t('products.viewDetails')}
                            >
                              <FiEye className="h-4 w-4" />
                            </Link>
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => { setEditingProduct(product); setModalOpen(true); }}
                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-primary-700"
                                title={t('common.edit')}
                              >
                                <FiEdit2 className="h-4 w-4" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => handleDelete(product)}
                                className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                                title={t('common.delete')}
                              >
                                <FiTrash2 className="h-4 w-4" />
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
            <Pagination
              page={page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              limit={limit}
              itemLabel={t('products.items')}
              onPageChange={setPage}
            />
          </>
        )}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingProduct ? t('products.editProduct') : t('products.addProduct')}
        size="lg"
      >
        <ProductFormModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSuccess={fetchProducts}
          product={editingProduct}
        />
      </Modal>
    </div>
  );
};

export default ProductsPage;
