import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import supplierService from '../../services/supplierService';
import LoadingSpinner from '../common/LoadingSpinner';

const SupplierFormModal = ({ isOpen, onClose, onSuccess, supplier = null }) => {
  const isEdit = Boolean(supplier);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      name: '',
      phone: '',
      address: '',
      gstNumber: '',
      openingBalance: 0,
      notes: '',
      isActive: true,
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        name: supplier?.name || '',
        phone: supplier?.phone || '',
        address: supplier?.address || '',
        gstNumber: supplier?.gstNumber || '',
        openingBalance: supplier?.openingBalance ?? 0,
        notes: supplier?.notes || '',
        isActive: supplier?.isActive ?? true,
      });
    }
  }, [isOpen, supplier, reset]);

  const onSubmit = async (data) => {
    try {
      const payload = {
        name: data.name.trim(),
        phone: data.phone?.trim() || '',
        address: data.address?.trim() || '',
        gstNumber: data.gstNumber?.trim().toUpperCase() || '',
        openingBalance: Number(data.openingBalance) || 0,
        notes: data.notes?.trim() || '',
        isActive: data.isActive,
      };

      if (isEdit) {
        await supplierService.updateSupplier(supplier.id, payload);
        toast.success('Supplier updated successfully');
      } else {
        await supplierService.createSupplier(payload);
        toast.success('Supplier created successfully');
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
          <label className="mb-1 block text-sm font-medium text-slate-700">Supplier Name *</label>
          <input
            {...register('name', { required: 'Supplier name is required' })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            placeholder="Enter supplier name"
          />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Phone</label>
          <input
            {...register('phone', {
              pattern: { value: /^[0-9+\-\s()]*$/, message: 'Invalid phone number' },
            })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            placeholder="9876543210"
          />
          {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">GST Number</label>
          <input
            {...register('gstNumber', {
              pattern: { value: /^[0-9A-Z]*$/, message: 'Invalid GST format' },
            })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            placeholder="22AAAAA0000A1Z5"
          />
          {errors.gstNumber && <p className="mt-1 text-xs text-red-600">{errors.gstNumber.message}</p>}
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

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" {...register('isActive')} className="rounded border-slate-300 text-primary-600" />
        Active supplier
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
          {isSubmitting ? <LoadingSpinner size="sm" /> : isEdit ? 'Update Supplier' : 'Create Supplier'}
        </button>
      </div>
    </form>
  );
};

export default SupplierFormModal;
