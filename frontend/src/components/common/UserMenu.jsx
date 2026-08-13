import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiChevronDown, FiKey, FiLogOut, FiUser } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import UserAvatar from './UserAvatar';
import { formatRoleName } from '../../utils/auth';

const UserMenu = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch {
      toast.error('Logout failed');
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-white/90 px-2.5 py-1.5 shadow-sm transition hover:border-emerald-200 hover:bg-white"
      >
        <UserAvatar user={user} size="sm" />
        <div className="hidden min-w-0 text-left sm:block">
          <p className="truncate text-xs font-semibold text-slate-800">{user?.fullName}</p>
          <p className="truncate text-[10px] capitalize text-slate-400">
            {formatRoleName(user?.roleName)}
          </p>
        </div>
        <FiChevronDown className={`hidden h-4 w-4 text-slate-400 transition sm:block ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="truncate text-sm font-semibold text-slate-800">{user?.fullName}</p>
            <p className="truncate text-xs text-slate-500">{user?.email}</p>
          </div>

          <Link
            to="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-emerald-50"
          >
            <FiUser className="h-4 w-4 text-primary-600" />
            My Profile
          </Link>

          <Link
            to="/profile#password"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-emerald-50"
          >
            <FiKey className="h-4 w-4 text-primary-600" />
            Change Password
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
          >
            <FiLogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
