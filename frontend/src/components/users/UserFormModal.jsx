import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import userService from '../../services/userService';
import PasswordInput from '../common/PasswordInput';
import LoadingSpinner from '../common/LoadingSpinner';

const UserFormModal = ({ isOpen, onClose, onSuccess, user = null, roles = [] }) => {
  const isEdit = Boolean(user);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      roleId: '',
      username: '',
      email: '',
      fullName: '',
      phone: '',
      password: '',
      isActive: true,
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        roleId: user?.roleId || roles[0]?.id || '',
        username: user?.username || '',
        email: user?.email || '',
        fullName: user?.fullName || '',
        phone: user?.phone || '',
        password: '',
        isActive: user?.isActive ?? true,
      });
    }
  }, [isOpen, user, roles, reset]);

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      const payload = {
        roleId: Number(data.roleId),
        username: data.username.trim(),
        email: data.email.trim(),
        fullName: data.fullName.trim(),
        phone: data.phone?.trim() || '',
        isActive: data.isActive,
      };

      if (!isEdit || data.password) {
        payload.password = data.password;
      }

      if (isEdit) {
        await userService.updateUser(user.id, payload);
        toast.success('User updated successfully');
      } else {
        await userService.createUser(payload);
        toast.success('User created successfully');
      }

      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Full Name *</label>
          <input
            {...register('fullName', { required: 'Full name is required' })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          />
          {errors.fullName && <p className="mt-1 text-xs text-red-600">{errors.fullName.message}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Username *</label>
          <input
            {...register('username', {
              required: 'Username is required',
              minLength: { value: 3, message: 'Minimum 3 characters' },
              pattern: {
                value: /^[a-zA-Z0-9_]+$/,
                message: 'Letters, numbers, underscore only',
              },
            })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          />
          {errors.username && <p className="mt-1 text-xs text-red-600">{errors.username.message}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Email *</label>
          <input
            type="email"
            {...register('email', {
              required: 'Email is required',
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Valid email required',
              },
            })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Phone</label>
          <input
            {...register('phone')}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Role *</label>
          <select
            {...register('roleId', { required: 'Role is required' })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          >
            {roles.map((role) => (
              <option key={role.id} value={role.id}>{role.label}</option>
            ))}
          </select>
          {errors.roleId && <p className="mt-1 text-xs text-red-600">{errors.roleId.message}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            {isEdit ? 'New Password (optional)' : 'Password *'}
          </label>
          <PasswordInput
            {...register('password', {
              required: isEdit ? false : 'Password is required',
              minLength: { value: 8, message: 'Minimum 8 characters' },
            })}
            autoComplete="new-password"
          />
          {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" {...register('isActive')} className="rounded border-slate-300 text-primary-600" />
        Active user account
      </label>

      <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-70"
        >
          {submitting ? <LoadingSpinner size="sm" /> : isEdit ? 'Update User' : 'Create User'}
        </button>
      </div>
    </form>
  );
};

export default UserFormModal;
