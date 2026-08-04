import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import cashBookService from '../../services/cashBookService';
import LoadingSpinner from '../common/LoadingSpinner';

const TYPE_OPTIONS = [
  { value: 'cash_in', label: 'Cash In' },
  { value: 'cash_out', label: 'Cash Out' },
  { value: 'expense', label: 'Expense' },
  { value: 'transfer', label: 'Transfer' },
];

const METHOD_OPTIONS = ['cash', 'upi', 'card', 'bank'];

const CashBookEntryModal = ({ isOpen, onClose, onSuccess }) => {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      transactionType: 'cash_in',
      amount: '',
      paymentMethod: 'cash',
      category: '',
      transactionDate: new Date().toISOString().slice(0, 10),
      remarks: '',
    },
  });

  const transactionType = watch('transactionType');

  useEffect(() => {
    if (isOpen) {
      reset({
        transactionType: 'cash_in',
        amount: '',
        paymentMethod: 'cash',
        category: '',
        transactionDate: new Date().toISOString().slice(0, 10),
        remarks: '',
      });
    }
  }, [isOpen, reset]);

  const onSubmit = async (data) => {
    try {
      await cashBookService.createEntry({
        transactionType: data.transactionType,
        amount: Number(data.amount),
        paymentMethod: data.paymentMethod,
        category: data.category?.trim() || undefined,
        transactionDate: data.transactionDate,
        remarks: data.remarks?.trim() || undefined,
      });
      toast.success('Cash book entry saved');
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save entry');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">New Cash Book Entry</h2>
          <p className="text-sm text-slate-500">Record cash in, cash out, expense, or transfer</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Type *</label>
            <select
              {...register('transactionType', { required: true })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
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
              <label className="mb-1 block text-sm font-medium text-slate-700">Payment Method *</label>
              <select
                {...register('paymentMethod', { required: true })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
              >
                {METHOD_OPTIONS.map((method) => (
                  <option key={method} value={method}>{method.toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Date *</label>
            <input
              type="date"
              {...register('transactionDate', { required: true })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Category {transactionType === 'expense' ? '*' : ''}
            </label>
            <input
              type="text"
              {...register('category', {
                required: transactionType === 'expense' ? 'Category is required for expenses' : false,
              })}
              placeholder={transactionType === 'expense' ? 'e.g. Transport, Salary' : 'Optional category'}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
            />
            {errors.category && <p className="mt-1 text-xs text-red-600">{errors.category.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Remarks</label>
            <textarea
              {...register('remarks')}
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
              placeholder="Optional notes..."
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
              {isSubmitting ? <LoadingSpinner size="sm" /> : 'Save Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CashBookEntryModal;
