import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FiEdit2,
  FiPlus,
  FiSearch,
  FiTrash2,
  FiUserCheck,
  FiUserX,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import userService from '../../services/userService';
import { useAuth } from '../../context/AuthContext';
import { formatRoleName } from '../../utils/auth';
import { catalogLabel } from '../../utils/catalogI18n';
import { getCached } from '../../utils/apiCache';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import UserFormModal from '../../components/users/UserFormModal';

const UsersPage = () => {
  const { t } = useTranslation();
    const { user: currentUser, checkPermission, loading: authLoading, isAuthenticated } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [fetching, setFetching] = useState(true);
  const hasLoadedOnce = useRef(false);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const canCreate = checkPermission('users', 'create');
  const canEdit = checkPermission('users', 'edit');
  const canDelete = checkPermission('users', 'delete');

  const fetchRoles = useCallback(async () => {
    try {
      const response = await userService.getRoles();
      setRoles(response.data.data.roles);
    } catch {
      toast.error(t('users.loadRolesFailed'));
    }
  }, [t]);

  const fetchUsers = useCallback(async () => {
    const params = {
      page,
      limit,
      search,
      roleId: roleFilter || undefined,
      isActive: statusFilter || undefined,
      sortBy,
      sortOrder,
    };
    const cacheKey = `users:list:${JSON.stringify(params)}`;
    const cached = getCached(cacheKey);

    if (cached?.data?.data) {
      setUsers(cached.data.data);
      setPagination(cached.data.pagination);
      hasLoadedOnce.current = true;
      setFetching(false);
    } else if (!hasLoadedOnce.current) {
      setFetching(true);
    }

    try {
      const response = await userService.getUsers(params);
      setUsers(response.data.data);
      setPagination(response.data.pagination);
      hasLoadedOnce.current = true;
    } catch (error) {
      if (!cached?.data?.data) {
        toast.error(
          error.code === 'ERR_NETWORK'
            ? t('common.networkError')
            : error.response?.data?.message || t('users.loadFailed')
        );
      }
    } finally {
      setFetching(false);
    }
  }, [page, limit, search, roleFilter, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;

    const rolesCached = getCached('users:roles');
    if (rolesCached?.data?.data?.roles) {
      setRoles(rolesCached.data.data.roles);
    }

    fetchRoles();
  }, [fetchRoles, authLoading, isAuthenticated]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    fetchUsers();
  }, [fetchUsers, authLoading, isAuthenticated]);

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

  const handleCreate = () => {
    setEditingUser(null);
    setModalOpen(true);
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setModalOpen(true);
  };

  const handleToggleStatus = async (user) => {
    try {
      await userService.updateStatus(user.id, !user.isActive);
      toast.success(
        t(user.isActive ? 'common.entityDisabled' : 'common.entityEnabled', { entity: t('nav.users') })
      );
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || t('common.statusUpdateFailed'));
    }
  };

  const handleDelete = async (user) => {
    if (!window.confirm(t('users.deleteConfirm', { name: user.username }))) return;

    try {
      await userService.deleteUser(user.id);
      toast.success(t('users.deleted'));
      fetchUsers();
    } catch (error) {
      toast.error(error.response?.data?.message || t('common.deleteFailed'));
    }
  };

  const sortIndicator = (column) => {
    if (sortBy !== column) return '';
    return sortOrder === 'asc' ? ' ↑' : ' ↓';
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('users.managementTitle')}</h1>
          <p className="mt-1 text-sm text-slate-500">{t('users.managementSubtitle')}</p>
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={handleCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
          >
            <FiPlus className="h-4 w-4" />
            {t('users.addUser')}
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
            placeholder={t('users.searchPlaceholder')}
            className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-primary-500"
        >
          <option value="">{t('common.allRoles')}</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>{role.label}</option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-primary-500"
        >
          <option value="">{t('common.allStatus')}</option>
          <option value="true">{t('common.active')}</option>
          <option value="false">{t('common.inactive')}</option>
        </select>
      </div>

      <div className={`overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-opacity ${fetching && users.length > 0 ? 'opacity-70' : ''}`}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {[
                  { key: 'fullName', label: t('common.name') },
                  { key: 'username', label: t('common.username') },
                  { key: 'email', label: t('common.email') },
                  { key: 'roleName', label: t('common.role') },
                  { key: 'isActive', label: t('common.status') },
                  { key: 'lastLoginAt', label: t('common.lastLogin') },
                ].map((col) => (
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
              {fetching && users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-400">
                    {t('users.loadingUsers')}
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">
                    {t('users.noUsersFound')}
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{catalogLabel(user.fullName, 'customers')}</p>
                      <p className="text-xs text-slate-500">{user.phone || '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">@{user.username}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                        {formatRoleName(user.roleName)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        user.isActive
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {user.isActive ? t('common.active') : t('common.inactive')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-500">
                      {user.lastLoginAt
                        ? new Date(user.lastLoginAt).toLocaleString()
                        : t('common.never')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {canEdit && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleEdit(user)}
                              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-primary-700"
                              title={t('users.editUserTitle')}
                            >
                              <FiEdit2 className="h-4 w-4" />
                            </button>
                            {user.id !== currentUser?.id && (
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(user)}
                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-amber-600"
                                title={user.isActive ? t('users.disableUser') : t('users.enableUser')}
                              >
                                {user.isActive ? (
                                  <FiUserX className="h-4 w-4" />
                                ) : (
                                  <FiUserCheck className="h-4 w-4" />
                                )}
                              </button>
                            )}
                          </>
                        )}
                        {canDelete && user.id !== currentUser?.id && (
                          <button
                            type="button"
                            onClick={() => handleDelete(user)}
                            className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                            title={t('users.deleteUserTitle')}
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
      </div>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingUser ? t('users.editUser') : t('users.createUser')}
        size="lg"
      >
        <UserFormModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSuccess={fetchUsers}
          user={editingUser}
          roles={roles}
        />
      </Modal>
    </div>
  );
};

export default UsersPage;
