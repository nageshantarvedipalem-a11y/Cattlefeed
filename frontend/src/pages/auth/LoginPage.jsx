import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { FiUser } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { loginRules } from '../../validations/authValidation';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PasswordInput from '../../components/common/PasswordInput';

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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-teal-900 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100">
            <span className="text-2xl font-bold text-primary-700">CF</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Cattle Feed ERP</h1>
          <p className="mt-2 text-sm text-slate-500">Sign in to your admin account</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              Username or Email
            </label>
            <div className="relative">
              <FiUser className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                {...register('identifier', loginRules.identifier)}
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
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
            />
            {errors.password && (
              <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
            )}
          </div>

          <div className="flex items-center justify-end">
            <Link to="/forgot-password" className="text-sm font-medium text-primary-700 hover:text-primary-800">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center rounded-lg bg-primary-600 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? <LoadingSpinner size="sm" /> : 'Sign In'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          Default: admin / Admin@123
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
