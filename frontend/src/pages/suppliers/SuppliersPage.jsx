import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiEdit2,
  FiEye,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiTruck,
  FiUserCheck,
  FiUserX,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import supplierService from '../../services/supplierService';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../utils/format';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import SupplierFormModal from '../../components/suppliers/SupplierFormModal';

const SuppliersPage = () => {
  const { checkPermission } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);

  const canCreate = checkPermission('suppliers', 'create');
  const canEdit = checkPermission('suppliers', 'edit');
  const canDelete = checkPermission('suppliers', 'delete');

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await supplierService.getSuppliers({
        page,
        limit,
        search,
        isActive: statusFilter || undefined,
        sortBy,
        sortOrder,
      });
      setSuppliers(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

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

  const handleToggleStatus = async (supplier) => {
    try {
      await supplierService.updateStatus(supplier.id, !supplier.isActive);
      toast.success(`Supplier ${supplier.isActive ? 'disabled' : 'enabled'} successfully`);
      fetchSuppliers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Status update failed');
    }
  };

  const handleDelete = async (supplier) => {
    const purchaseNote = supplier.totalPurchases > 0
      ? `\n\nThis supplier has ${supplier.totalPurchases} purchase record(s). Purchase/stock data will be kept; only the supplier profile will be removed.`
      : '';
    if (!window.confirm(`Delete supplier "${supplier.name}"?${purchaseNote}`)) return;
    try {
      await supplierService.deleteSupplier(supplier.id);
      toast.success('Supplier deleted successfully');
      fetchSuppliers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Delete failed');
    }
  };

  const sortIndicator = (column) => (sortBy === column ? (sortOrder === 'asc' ? ' ↑' : ' ↓') : '');

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Suppliers</h1>
          <p className="mt-1 text-sm text-slate-500">Manage suppliers for stock-in and purchases</p>
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={() => { setEditingSupplier(null); setModalOpen(true); }}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
          >
            <FiPlus className="h-4 w-4" />
            Add Supplier
          </button>
        )}
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="relative sm:col-span-2">
          <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search name, phone, GST, address..."
            className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-primary-500"
        >
          <option value="">All Status</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
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
                    {[
                      { key: 'name', label: 'Name' },
                      { key: 'phone', label: 'Phone' },
                      { key: 'gstNumber', label: 'GST' },
                      { key: 'totalPurchases', label: 'Purchases' },
                      { key: 'openingBalance', label: 'Opening Bal.' },
                      { key: 'isActive', label: 'Status' },
                    ].map((col) => (
                      <th
                        key={col.key}
                        onClick={() => handleSort(col.key)}
                        className="cursor-pointer px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-700"
                      >
                        {col.label}{sortIndicator(col.key)}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {suppliers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">No suppliers found</td>
                    </tr>
                  ) : (
                    suppliers.map((supplier) => (
                      <tr key={supplier.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <FiTruck className="h-4 w-4 text-slate-400" />
                            <div>
                              <p className="font-medium text-slate-900">{supplier.name}</p>
                              {supplier.pendingAmount > 0 && (
                                <p className="text-xs text-amber-600">Pending: {formatCurrency(supplier.pendingAmount)}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">{supplier.phone || '—'}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{supplier.gstNumber || '—'}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {supplier.totalPurchases}
                          {supplier.totalPurchaseAmount > 0 && (
                            <span className="block text-xs text-slate-500">{formatCurrency(supplier.totalPurchaseAmount)}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">{formatCurrency(supplier.openingBalance)}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            supplier.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {supplier.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              to={`/suppliers/${supplier.id}`}
                              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-primary-700"
                              title="View details"
                            >
                              <FiEye className="h-4 w-4" />
                            </Link>
                            {canEdit && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => { setEditingSupplier(supplier); setModalOpen(true); }}
                                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-primary-700"
                                  title="Edit"
                                >
                                  <FiEdit2 className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleStatus(supplier)}
                                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-amber-600"
                                  title={supplier.isActive ? 'Disable' : 'Enable'}
                                >
                                  {supplier.isActive ? <FiUserX className="h-4 w-4" /> : <FiUserCheck className="h-4 w-4" />}
                                </button>
                              </>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => handleDelete(supplier)}
                                className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                                title="Delete"
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
              onPageChange={setPage}
            />
          </>
        )}
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingSupplier ? 'Edit Supplier' : 'Add Supplier'}
        size="lg"
      >
        <SupplierFormModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSuccess={fetchSuppliers}
          supplier={editingSupplier}
        />
      </Modal>
    </div>
  );
};

export default SuppliersPage;
