import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  FiHome,
  FiKey,
  FiLogOut,
  FiMenu,
  FiUsers,
  FiUser,
  FiTruck,
  FiPackage,
  FiLayers,
  FiShoppingCart,
  FiBookOpen,
  FiDollarSign,
  FiCreditCard,
  FiTrendingUp,
  FiFileText,
  FiMessageCircle,
  FiX,
} from 'react-icons/fi';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { formatRoleName } from '../utils/auth';

const navItems = [
  { to: '/', label: 'Dashboard', icon: FiHome, module: 'dashboard' },
  { to: '/users', label: 'Users', icon: FiUsers, module: 'users' },
  { to: '/customers', label: 'Customers', icon: FiUser, module: 'customers' },
  { to: '/suppliers', label: 'Suppliers', icon: FiTruck, module: 'suppliers' },
  { to: '/products', label: 'Products', icon: FiPackage, module: 'products' },
  { to: '/stock', label: 'Stock', icon: FiLayers, module: 'stock' },
  { to: '/billing', label: 'Billing', icon: FiShoppingCart, module: 'billing' },
  { to: '/ledger', label: 'Ledger', icon: FiBookOpen, module: 'ledger' },
  { to: '/cashbook', label: 'Cash Book', icon: FiDollarSign, module: 'cashbook' },
  { to: '/payments', label: 'Pending Payments', icon: FiCreditCard, module: 'payments' },
  { to: '/profit', label: 'Profit', icon: FiTrendingUp, module: 'reports' },
  { to: '/reports', label: 'Reports', icon: FiFileText, module: 'reports' },
  { to: '/whatsapp', label: 'WhatsApp', icon: FiMessageCircle, module: 'settings' },
  { to: '/change-password', label: 'Change Password', icon: FiKey, module: null },
];

const DashboardLayout = () => {
  const { user, logout, checkPermission } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const visibleNavItems = navItems.filter((item) => {
    if (!item.module) return true;
    return checkPermission(item.module, 'view');
  });

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch {
      toast.error('Logout failed');
    }
  };

  const sidebarContent = (
    <>
      <div className="border-b border-slate-700 px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 font-bold text-white">
            CF
          </div>
          <div>
            <p className="font-semibold text-white">Cattle Feed ERP</p>
            <p className="text-xs text-slate-400">Admin Dashboard</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {visibleNavItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? 'bg-teal-700 text-white'
                  : 'text-slate-300 hover:bg-slate-700 hover:text-white'
              }`
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-700 p-4">
        <div className="mb-3 rounded-lg bg-slate-800 px-3 py-2">
          <p className="truncate text-sm font-medium text-white">{user?.fullName}</p>
          <p className="truncate text-xs text-slate-400">@{user?.username}</p>
          <span className="mt-1 inline-block rounded-full bg-primary-900 px-2 py-0.5 text-xs text-primary-200">
            {formatRoleName(user?.roleName)}
          </span>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-red-300 transition hover:bg-red-950 hover:text-red-200"
        >
          <FiLogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-64 shrink-0 flex-col bg-slate-900 lg:flex">
        {sidebarContent}
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative flex h-full w-64 flex-col bg-slate-900">
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="absolute right-3 top-3 rounded-lg p-2 text-slate-300 hover:bg-slate-800"
            >
              <FiX className="h-5 w-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          >
            <FiMenu className="h-5 w-5" />
          </button>
          <div className="ml-auto text-right">
            <p className="text-sm font-medium text-slate-900">{user?.fullName}</p>
            <p className="text-xs text-slate-500">{formatRoleName(user?.roleName)}</p>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
