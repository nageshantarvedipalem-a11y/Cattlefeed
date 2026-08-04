import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import customerService from '../../services/customerService';
import LoadingSpinner from '../common/LoadingSpinner';

const CustomerFormModal = ({ isOpen, onClose, onSuccess, customer = null }) => {
  const isEdit = Boolean(customer);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      name: '',
      phone: '',
      village: '',
      address: '',
      openingBalance: 0,
      openingBalanceType: 'debit',
      creditLimit: 0,
      notes: '',
      isActive: true,
    },
  });

  const openingBalance = watch('openingBalance');

  useEffect(() => {
    if (isOpen) {
      reset({
        name: customer?.name || '',
        phone: customer?.phone || '',
        village: customer?.village || '',
        address: customer?.address || '',
        openingBalance: customer?.openingBalance ?? 0,
        openingBalanceType: customer?.openingBalanceType || 'debit',
        creditLimit: customer?.creditLimit ?? 0,
        notes: customer?.notes || '',
        isActive: customer?.isActive ?? true,
      });
    }
  }, [isOpen, customer, reset]);

  const onSubmit = async (data) => {
    try {
      const payload = {
        name: data.name.trim(),
        phone: data.phone.trim(),
        village: data.village?.trim() || '',
        address: data.address?.trim() || '',
        openingBalance: Number(data.openingBalance) || 0,
        openingBalanceType: data.openingBalanceType,
        creditLimit: Number(data.creditLimit) || 0,
        notes: data.notes?.trim() || '',
        isActive: data.isActive,
      };

      if (isEdit) {
        await customerService.updateCustomer(customer.id, payload);
        toast.success('Customer updated successfully');
      } else {
        await customerService.createCustomer(payload);
        toast.success('Customer created successfully');
      }

      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">Customer Name *</label>
          <input
            {...register('name', { required: 'Customer name is required' })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            placeholder="Enter customer name"
          />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Phone Number *</label>
          <input
            {...register('phone', {
              required: 'Phone number is required',
              pattern: {
                value: /^[0-9+\-\s()]+$/,
                message: 'Invalid phone number',
              },
            })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            placeholder="9876543210"
          />
          {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Village</label>
          <input
            {...register('village')}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            placeholder="Village name"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">Address</label>
          <textarea
            {...register('address')}
            rows={2}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            placeholder="Full address"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Opening Balance</label>
          <input
            type="number"
            step="0.01"
            min="0"
            {...register('openingBalance', { min: { value: 0, message: 'Must be 0 or greater' } })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            disabled={isEdit && customer?.totalSales > 0}
          />
          {isEdit && customer?.totalSales > 0 && (
            <p className="mt-1 text-xs text-amber-600">Cannot change after sales exist</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Balance Type</label>
          <select
            {...register('openingBalanceType')}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            disabled={isEdit && customer?.totalSales > 0}
          >
            <option value="debit">Debit (Customer owes)</option>
            <option value="credit">Credit (We owe customer)</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Credit Limit</label>
          <input
            type="number"
            step="0.01"
            min="0"
            {...register('creditLimit', { min: { value: 0, message: 'Must be 0 or greater' } })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
          <textarea
            {...register('notes')}
            rows={2}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            placeholder="Additional notes..."
          />
        </div>
      </div>

      {Number(openingBalance) > 0 && !isEdit && (
        <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
          Opening balance will be recorded in the customer ledger automatically.
        </p>
      )}

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" {...register('isActive')} className="rounded border-slate-300 text-primary-600" />
        Active customer
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
          disabled={isSubmitting}
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-70"
        >
          {isSubmitting ? <LoadingSpinner size="sm" /> : isEdit ? 'Update Customer' : 'Create Customer'}
        </button>
      </div>
    </form>
  );
};

export default CustomerFormModal;
