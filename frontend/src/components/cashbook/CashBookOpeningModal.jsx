import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import cashBookService from '../../services/cashBookService';
import LoadingSpinner from '../common/LoadingSpinner';

const CashBookOpeningModal = ({ isOpen, onClose, onSuccess, suggestedAmount = 0 }) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      amount: suggestedAmount || '',
      remarks: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        date: new Date().toISOString().slice(0, 10),
        amount: suggestedAmount || '',
        remarks: '',
      });
    }
  }, [isOpen, suggestedAmount, reset]);

  const onSubmit = async (data) => {
    try {
      await cashBookService.setOpeningBalance({
        date: data.date,
        amount: Number(data.amount),
        remarks: data.remarks?.trim() || 'Opening balance',
      });
      toast.success('Opening balance saved. Next days will start from previous closing.');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to set opening balance');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">Set Opening Balance</h2>
          <p className="text-sm text-slate-500">
            Use this for the first day. After that, today&apos;s opening is yesterday&apos;s closing.
          </p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Date *</label>
            <input
              type="date"
              {...register('date', { required: true })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Opening Amount *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              {...register('amount', {
                required: 'Amount is required',
                min: { value: 0, message: 'Cannot be negative' },
              })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
            />
            {errors.amount && <p className="mt-1 text-xs text-red-600">{errors.amount.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
            <textarea
              {...register('remarks')}
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
            />
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-70"
            >
              {isSubmitting ? <LoadingSpinner size="sm" /> : 'Save Opening'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CashBookOpeningModal;
