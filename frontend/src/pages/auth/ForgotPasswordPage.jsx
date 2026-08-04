import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { FiMail, FiArrowLeft } from 'react-icons/fi';
import toast from 'react-hot-toast';
import authService from '../../services/authService';
import { forgotPasswordRules } from '../../validations/authValidation';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const ForgotPasswordPage = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async (data) => {
    try {
      const response = await authService.forgotPassword(data.email);
      const result = response.data.data;
      toast.success(result.message);

      if (result.resetPath) {
        toast.success(`Dev reset link: ${result.resetPath}`, { duration: 8000 });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Request failed');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <Link to="/login" className="mb-6 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-primary-700">
          <FiArrowLeft /> Back to login
        </Link>

        <h1 className="text-2xl font-bold text-slate-900">Forgot Password</h1>
        <p className="mt-2 text-sm text-slate-500">
          Enter your email address and we will generate a password reset link.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
            <div className="relative">
              <FiMail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                {...register('email', forgotPasswordRules.email)}
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                placeholder="admin@cattlefeed.com"
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center rounded-lg bg-primary-600 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-70"
          >
            {isSubmitting ? <LoadingSpinner size="sm" /> : 'Send Reset Link'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
