import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import authService from '../../services/authService';
import { changePasswordRules } from '../../validations/authValidation';
import PasswordInput from '../../components/common/PasswordInput';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const ChangePasswordPage = () => {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm();

  const newPassword = watch('newPassword');

  const onSubmit = async (data) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      const response = await authService.changePassword(
        data.currentPassword,
        data.newPassword,
        data.confirmPassword
      );
      toast.success(response.data.message);
      reset();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Password change failed');
    }
  };

  return (
    <div className="max-w-xl">
      <h2 className="text-2xl font-bold text-slate-900">Change Password</h2>
      <p className="mt-1 text-sm text-slate-500">Update your account password securely.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Current Password</label>
          <PasswordInput {...register('currentPassword', changePasswordRules.currentPassword)} />
          {errors.currentPassword && (
            <p className="mt-1 text-xs text-red-600">{errors.currentPassword.message}</p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">New Password</label>
          <PasswordInput {...register('newPassword', changePasswordRules.newPassword)} autoComplete="new-password" />
          {errors.newPassword && (
            <p className="mt-1 text-xs text-red-600">{errors.newPassword.message}</p>
          )}
          <p className="mt-1 text-xs text-slate-500">
            Must include uppercase, lowercase, number, and special character.
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Confirm New Password</label>
          <PasswordInput
            {...register('confirmPassword', {
              ...changePasswordRules.confirmPassword,
              validate: (value) => value === newPassword || 'Passwords do not match',
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
          className="rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-70"
        >
          {isSubmitting ? 'Updating...' : 'Update Password'}
        </button>
      </form>
    </div>
  );
};

export default ChangePasswordPage;
