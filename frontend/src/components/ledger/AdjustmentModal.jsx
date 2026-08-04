import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import ledgerService from '../../services/ledgerService';
import LoadingSpinner from '../common/LoadingSpinner';

const AdjustmentModal = ({ isOpen, onClose, onSuccess, customerId, customerName }) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      adjustmentType: 'debit',
      amount: 0,
      remarks: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({ adjustmentType: 'debit', amount: 0, remarks: '' });
    }
  }, [isOpen, reset]);

  const onSubmit = async (data) => {
    try {
      await ledgerService.createAdjustment({
        customerId,
        adjustmentType: data.adjustmentType,
        amount: Number(data.amount),
        remarks: data.remarks?.trim() || '',
      });
      toast.success('Ledger adjustment saved');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Adjustment failed');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">Ledger Adjustment</h2>
          <p className="text-sm text-slate-500">{customerName}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Type *</label>
            <select
              {...register('adjustmentType', { required: true })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
            >
              <option value="debit">Debit (customer owes more)</option>
              <option value="credit">Credit (reduce balance)</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Amount *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              {...register('amount', { required: 'Amount is required', min: 0.01 })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
            />
            {errors.amount && <p className="mt-1 text-xs text-red-600">{errors.amount.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Remarks</label>
            <textarea
              {...register('remarks')}
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
              placeholder="Reason for adjustment..."
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-70"
            >
              {isSubmitting ? <LoadingSpinner size="sm" /> : 'Save Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdjustmentModal;
