import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import supplierService from '../../services/supplierService';
import LoadingSpinner from '../common/LoadingSpinner';

const SupplierFormModal = ({ isOpen, onClose, onSuccess, supplier = null }) => {
  const { t } = useTranslation();
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
        toast.success(t('suppliers.updated'));
      } else {
        await supplierService.createSupplier(payload);
        toast.success(t('suppliers.created'));
      }

      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || t('common.operationFailed'));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">{t('suppliers.supplierName')} *</label>
          <input
            {...register('name', { required: t('suppliers.supplierNameRequired') })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            placeholder={t('suppliers.enterSupplierName')}
          />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">{t('common.phone')}</label>
          <input
            {...register('phone', {
              pattern: { value: /^[0-9+\-\s()]*$/, message: t('customers.invalidPhone') },
            })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            placeholder="9876543210"
          />
          {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">{t('common.gst')}</label>
          <input
            {...register('gstNumber', {
              pattern: { value: /^[0-9A-Z]*$/, message: t('suppliers.invalidGst') },
            })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm uppercase outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            placeholder="22AAAAA0000A1Z5"
          />
          {errors.gstNumber && <p className="mt-1 text-xs text-red-600">{errors.gstNumber.message}</p>}
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">{t('common.address')}</label>
          <textarea
            {...register('address')}
            rows={2}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            placeholder={t('customers.fullAddress')}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">{t('common.openingBalance')}</label>
          <input
            type="number"
            step="0.01"
            min="0"
            {...register('openingBalance', { min: { value: 0, message: t('products.mustBeZeroOrGreater') } })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-slate-700">{t('common.notes')}</label>
          <textarea
            {...register('notes')}
            rows={2}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            placeholder={t('customers.additionalNotes')}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" {...register('isActive')} className="rounded border-slate-300 text-primary-600" />
        {t('suppliers.activeSupplier')}
      </label>

      <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          {t('common.cancel')}
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-70"
        >
          {isSubmitting ? <LoadingSpinner size="sm" /> : isEdit ? t('suppliers.updateSupplier') : t('suppliers.createSupplier')}
        </button>
      </div>
    </form>
  );
};

export default SupplierFormModal;
