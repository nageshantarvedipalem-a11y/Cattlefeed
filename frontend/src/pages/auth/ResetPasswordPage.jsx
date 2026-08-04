import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { FiArrowLeft } from 'react-icons/fi';
import toast from 'react-hot-toast';
import authService from '../../services/authService';
import { resetPasswordRules } from '../../validations/authValidation';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import PasswordInput from '../../components/common/PasswordInput';

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tokenFromUrl = searchParams.get('token') || '';

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: { token: tokenFromUrl },
  });

  const password = watch('password');

  const onSubmit = async (data) => {
    if (data.password !== data.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      const response = await authService.resetPassword(
        data.token,
        data.password,
        data.confirmPassword
      );
      toast.success(response.data.message);
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Reset failed');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <Link to="/login" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-primary-700">
          <FiArrowLeft /> Back to login
        </Link>

        <h1 className="text-2xl font-bold text-slate-900">Reset Password</h1>
        <p className="mt-2 text-sm text-slate-500">Enter your reset token and new password.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Reset Token</label>
            <input
              type="text"
              {...register('token', { required: 'Reset token is required' })}
              className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              placeholder="Paste reset token"
            />
            {errors.token && (
              <p className="mt-1 text-xs text-red-600">{errors.token.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">New Password</label>
            <PasswordInput {...register('password', resetPasswordRules.password)} autoComplete="new-password" />
            {errors.password && (
              <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Confirm Password</label>
            <PasswordInput
              {...register('confirmPassword', {
                ...resetPasswordRules.confirmPassword,
                validate: (value) => value === password || 'Passwords do not match',
              })}
              autoComplete="new-password"
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center rounded-lg bg-primary-600 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-70"
          >
            {isSubmitting ? <LoadingSpinner size="sm" /> : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
