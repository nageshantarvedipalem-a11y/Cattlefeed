import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiEdit2,
  FiEye,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiUserCheck,
  FiUserX,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import customerService from '../../services/customerService';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../utils/format';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import CustomerFormModal from '../../components/customers/CustomerFormModal';

const CustomersPage = () => {
  const { checkPermission } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [villages, setVillages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [villageFilter, setVillageFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  const canCreate = checkPermission('customers', 'create');
  const canEdit = checkPermission('customers', 'edit');
  const canDelete = checkPermission('customers', 'delete');

  const fetchVillages = useCallback(async () => {
    try {
      const response = await customerService.getVillages();
      setVillages(response.data.data.villages);
    } catch {
      /* optional filter */
    }
  }, []);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await customerService.getCustomers({
        page,
        limit,
        search,
        village: villageFilter || undefined,
        isActive: statusFilter || undefined,
        sortBy,
        sortOrder,
      });
      setCustomers(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, villageFilter, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchVillages();
  }, [fetchVillages]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

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

  const handleToggleStatus = async (customer) => {
    try {
      await customerService.updateStatus(customer.id, !customer.isActive);
      toast.success(`Customer ${customer.isActive ? 'disabled' : 'enabled'} successfully`);
      fetchCustomers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Status update failed');
    }
  };

  const handleDelete = async (customer) => {
    if (!window.confirm(`Delete customer "${customer.name}"?`)) return;
    try {
      await customerService.deleteCustomer(customer.id);
      toast.success('Customer deleted successfully');
      fetchCustomers();
      fetchVillages();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Delete failed');
    }
  };

  const sortIndicator = (column) => (sortBy === column ? (sortOrder === 'asc' ? ' ↑' : ' ↓') : '');

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
          <p className="mt-1 text-sm text-slate-500">Manage customer accounts, credit limits, and balances</p>
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={() => { setEditingCustomer(null); setModalOpen(true); }}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
          >
            <FiPlus className="h-4 w-4" />
            Add Customer
          </button>
        )}
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2">
          <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search name, phone, village, address..."
            className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          />
        </div>

        <select
          value={villageFilter}
          onChange={(e) => { setVillageFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-primary-500"
        >
          <option value="">All Villages</option>
          {villages.map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>

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
                      { key: 'village', label: 'Village' },
                      { key: 'currentBalance', label: 'Balance' },
                      { key: 'creditLimit', label: 'Credit Limit' },
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
                  {customers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">No customers found</td>
                    </tr>
                  ) : (
                    customers.map((customer) => (
                      <tr key={customer.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{customer.name}</p>
                          {customer.pendingAmount > 0 && (
                            <p className="text-xs text-amber-600">Pending: {formatCurrency(customer.pendingAmount)}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">{customer.phone}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{customer.village || '—'}</td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">{formatCurrency(customer.currentBalance)}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{formatCurrency(customer.creditLimit)}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            customer.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {customer.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              to={`/customers/${customer.id}`}
                              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-primary-700"
                              title="View details"
                            >
                              <FiEye className="h-4 w-4" />
                            </Link>
                            {canEdit && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => { setEditingCustomer(customer); setModalOpen(true); }}
                                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-primary-700"
                                  title="Edit"
                                >
                                  <FiEdit2 className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleToggleStatus(customer)}
                                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-amber-600"
                                  title={customer.isActive ? 'Disable' : 'Enable'}
                                >
                                  {customer.isActive ? <FiUserX className="h-4 w-4" /> : <FiUserCheck className="h-4 w-4" />}
                                </button>
                              </>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => handleDelete(customer)}
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
        title={editingCustomer ? 'Edit Customer' : 'Add Customer'}
        size="lg"
      >
        <CustomerFormModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSuccess={() => { fetchCustomers(); fetchVillages(); }}
          customer={editingCustomer}
        />
      </Modal>
    </div>
  );
};

export default CustomersPage;
