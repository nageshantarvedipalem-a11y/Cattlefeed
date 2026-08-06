import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
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
  FiPlus,
  FiCalendar,
} from 'react-icons/fi';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import AppLogo from '../components/common/AppLogo';

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

const Sidebar = ({ expanded = false, onNavigate }) => {
  const { logout, checkPermission } = useAuth();
  const navigate = useNavigate();

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

  const rowClass = (isActive, extra = '') =>
    [
      'flex h-10 w-full cursor-pointer items-center rounded-xl text-[13px] font-medium transition-all duration-200',
      expanded
        ? 'gap-3 px-3'
        : 'justify-center px-0 group-hover/sidebar:justify-start group-hover/sidebar:gap-3 group-hover/sidebar:px-3',
      isActive
        ? 'sidebar-nav-active text-white shadow-sm'
        : 'text-emerald-100/80 hover:bg-white/10 hover:text-white',
      extra,
    ].join(' ');

  const textClass = expanded
    ? 'inline truncate'
    : 'hidden group-hover/sidebar:inline truncate';

  const contentPad = expanded ? 'px-3' : 'px-2 group-hover/sidebar:px-3';

  return (
    <aside
      className={`group/sidebar flex h-full shrink-0 flex-col overflow-hidden border-r border-primary-800/40 bg-gradient-to-b from-primary-950 via-primary-900 to-primary-950 text-white transition-[width] duration-300 ease-in-out ${
        expanded ? 'w-64' : 'w-[4.25rem] hover:w-64 hover:shadow-2xl hover:shadow-primary-950/50'
      }`}
    >
      <div className={`flex flex-1 flex-col overflow-hidden ${contentPad}`}>
        <div
          className={`flex h-[4.25rem] shrink-0 items-center border-b border-white/10 ${
            expanded ? 'gap-3' : 'justify-center group-hover/sidebar:justify-start group-hover/sidebar:gap-3'
          }`}
        >
          <AppLogo size="sm" imageClassName="bg-white ring-slate-200" />
          <div className={expanded ? 'min-w-0' : 'hidden min-w-0 group-hover/sidebar:block'}>
            <p className="truncate text-sm font-bold leading-tight text-white">Cattle Feed ERP</p>
            <p className="truncate text-[10px] font-medium uppercase tracking-wider text-amber-300/80">
              Feed Business Suite
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {visibleNavItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              title={label}
              onClick={onNavigate}
              className={({ isActive }) => rowClass(isActive)}
            >
              <Icon className="h-[1.125rem] w-[1.125rem] shrink-0" />
              <span className={textClass}>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="shrink-0 border-t border-white/10 py-3">
          <button
            type="button"
            onClick={handleLogout}
            title="Logout"
            className={rowClass(false, 'text-red-300 hover:bg-red-950/40 hover:text-red-200')}
          >
            <FiLogOut className="h-[1.125rem] w-[1.125rem] shrink-0" />
            <span className={textClass}>Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

const todayLabel = () =>
  new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

const DashboardLayout = () => {
  const { user, checkPermission } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const canBill = checkPermission('billing', 'view');

  const initials = user?.fullName
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'CF';

  return (
    <div className="flex h-full overflow-hidden bg-slate-50">
      <div className="hidden h-full shrink-0 lg:block">
        <Sidebar />
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="relative h-full w-64">
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="absolute right-3 top-3 z-10 rounded-lg p-2 text-emerald-100 hover:bg-white/10"
            >
              <FiX className="h-5 w-5" />
            </button>
            <Sidebar expanded onNavigate={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      <div className="dashboard-shell relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="dashboard-shell-pattern pointer-events-none absolute inset-0 opacity-70" aria-hidden="true" />

        <header className="relative z-30 flex shrink-0 items-center justify-between border-b border-emerald-100/80 bg-white/85 px-4 py-3 backdrop-blur-md lg:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-xl p-2 text-slate-600 hover:bg-emerald-50 lg:hidden"
            >
              <FiMenu className="h-5 w-5" />
            </button>
            <AppLogo size="xs" className="lg:hidden" />
            <div className="hidden lg:block">
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary-700">
                Cattle Feed ERP
              </p>
              <p className="flex items-center gap-1.5 text-sm text-slate-600">
                <FiCalendar className="h-3.5 w-3.5 text-amber-600" />
                {todayLabel()}
              </p>
            </div>
            <div className="lg:hidden">
              <p className="flex items-center gap-1.5 text-sm text-slate-600">
                <FiCalendar className="h-3.5 w-3.5 text-amber-600" />
                {todayLabel()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {canBill && (
              <Link
                to="/billing"
                className="hidden items-center gap-1.5 rounded-xl bg-gradient-to-r from-primary-700 to-primary-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-primary-900/20 transition hover:from-primary-800 hover:to-primary-700 sm:inline-flex"
              >
                <FiPlus className="h-3.5 w-3.5" />
                New Bill
              </Link>
            )}
            <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-white/90 px-2.5 py-1.5 shadow-sm">
              <div className="sidebar-brand-gradient flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-bold text-white">
                {initials}
              </div>
              <div className="hidden min-w-0 sm:block">
                <p className="truncate text-xs font-semibold text-slate-800">{user?.fullName}</p>
                <p className="truncate text-[10px] capitalize text-slate-400">{user?.role}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="relative z-10 flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
