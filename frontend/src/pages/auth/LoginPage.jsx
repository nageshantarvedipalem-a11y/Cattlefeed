import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  FiArrowRight,
  FiLayers,
  FiPackage,
  FiShoppingCart,
  FiTrendingUp,
  FiUser,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { loginRules } from '../../validations/authValidation';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PasswordInput from '../../components/common/PasswordInput';

const features = [
  { icon: FiShoppingCart, label: 'Sales & Billing', desc: 'Fast invoicing for feed orders' },
  { icon: FiLayers, label: 'Stock Control', desc: 'Track bags, pellets & inventory' },
  { icon: FiPackage, label: 'Purchase Management', desc: 'Supplier & purchase records' },
  { icon: FiTrendingUp, label: 'Profit & Reports', desc: 'Real-time business insights' },
];

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async (data) => {
    try {
      await login(data.identifier, data.password);
      toast.success('Login successful');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="login-page flex min-h-screen">
      {/* Brand panel — cattle feed theme */}
      <div className="login-brand relative hidden w-1/2 overflow-hidden lg:flex lg:items-center lg:justify-center">
        <div className="login-brand-overlay absolute inset-0" aria-hidden="true" />

        <div className="relative z-10 flex w-full max-w-xl flex-col items-center px-8 py-12 text-center xl:max-w-2xl xl:px-12">
          <div className="w-full">
            <h1 className="mx-auto max-w-lg text-4xl font-bold leading-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)] xl:text-5xl">
              Smart management for your
              <span className="mt-1 block bg-gradient-to-r from-amber-200 to-lime-200 bg-clip-text text-transparent drop-shadow-none">
                cattle feed business
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-white/95 drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]">
              Billing, inventory, ledger, payments and profit — everything you need to run
              your feed shop from one powerful dashboard.
            </p>
          </div>

          <div className="mt-10 grid w-full max-w-lg grid-cols-2 gap-4">
            {features.map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="flex h-full min-h-[7.5rem] flex-col items-center rounded-2xl border border-white/20 bg-black/30 p-4 text-center shadow-lg backdrop-blur-md transition hover:border-amber-400/40 hover:bg-black/40"
              >
                <div className="mb-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/25 text-amber-300">
                  <Icon className="h-[1.125rem] w-[1.125rem]" />
                </div>
                <p className="text-sm font-semibold leading-snug text-white">{label}</p>
                <p className="mt-1.5 flex-1 text-xs leading-relaxed text-white/75">{desc}</p>
              </div>
            ))}
          </div>

          <p className="mt-8 text-xs text-white/80 drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]">
            Trusted by feed dealers, distributors & farm suppliers
          </p>
        </div>
      </div>

      {/* Login form */}
      <div className="relative flex w-full flex-1 flex-col items-center justify-center bg-gradient-to-br from-amber-50 via-white to-emerald-50 px-4 py-10 sm:px-8 lg:w-1/2 lg:flex-none">
        <div className="login-form-pattern absolute inset-0 opacity-60" aria-hidden="true" />

        <div className="relative z-10 w-full max-w-md">
          {/* Mobile brand */}
          <div className="mb-8 text-center lg:hidden">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-primary-700 shadow-lg shadow-primary-900/20">
              <span className="text-2xl font-black text-white">CF</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Cattle Feed ERP</h1>
            <p className="mt-1 text-sm text-amber-800/70">Feed selling & business management</p>
          </div>

          <div className="rounded-2xl border border-amber-100/80 bg-white/90 p-8 shadow-xl shadow-amber-900/5 backdrop-blur-sm sm:p-10">
            <div className="mb-8 hidden lg:block">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary-700">
                Welcome back
              </p>
              <h2 className="mt-1 text-2xl font-bold text-slate-900">Sign in to your account</h2>
              <p className="mt-2 text-sm text-slate-500">
                Manage sales, stock and accounts for your feed business
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Username or Email
                </label>
                <div className="relative">
                  <FiUser className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-amber-600/70" />
                  <input
                    type="text"
                    {...register('identifier', loginRules.identifier)}
                    className="w-full rounded-xl border border-amber-200/80 bg-amber-50/30 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-100"
                    placeholder="Enter username or email"
                    autoComplete="username"
                  />
                </div>
                {errors.identifier && (
                  <p className="mt-1 text-xs text-red-600">{errors.identifier.message}</p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Password
                </label>
                <PasswordInput
                  {...register('password', loginRules.password)}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  className="rounded-xl border-amber-200/80 bg-amber-50/30 py-3 focus:border-primary-500 focus:bg-white focus:ring-primary-100"
                />
                {errors.password && (
                  <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
                )}
              </div>

              <div className="flex items-center justify-end">
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-primary-700 transition hover:text-primary-800"
                >
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary-700 to-primary-600 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-900/25 transition hover:from-primary-800 hover:to-primary-700 hover:shadow-primary-900/30 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <>
                    Sign In
                    <FiArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} Cattle Feed ERP · Inventory & Billing System
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
