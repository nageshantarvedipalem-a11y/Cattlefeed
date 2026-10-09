import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import cashBookService from '../../services/cashBookService';
import LoadingSpinner from '../common/LoadingSpinner';

const METHOD_OPTIONS = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank', label: 'Bank' },
  { value: 'other', label: 'Other' },
];

const DEFAULT_JAMA = ['Other Income', 'Advance Received', 'Owner Investment', 'Owner Capital', 'Loan Received', 'Refund', 'Miscellaneous'];
const DEFAULT_KARCHULU = ['Supplier Payment', 'Transport', 'Loading', 'Unloading', 'Electricity', 'Rent', 'Salary', 'Vehicle Expenses', 'Repairs', 'Maintenance', 'Office Expenses', 'Telephone/Internet', 'Fuel', 'Purchase', 'Other'];

const today = () => new Date().toISOString().slice(0, 10);

const CashBookEntryModal = ({
  isOpen,
  onClose,
  onSuccess,
  kind = 'jama',
  entry = null,
  categories = { jama: DEFAULT_JAMA, karchulu: DEFAULT_KARCHULU },
}) => {
  const isEdit = Boolean(entry?.id);
  const isJama = (isEdit ? entry.bookSide : kind) === 'jama';
  const categoryOptions = isJama
    ? (categories.jama || DEFAULT_JAMA)
    : (categories.karchulu || DEFAULT_KARCHULU);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      transactionDate: today(),
      amount: '',
      category: '',
      description: '',
      paymentMethod: 'cash',
      referenceNumber: '',
      partyName: '',
      remarks: '',
    },
  });

  useEffect(() => {
    if (!isOpen) return;
    if (entry) {
      reset({
        transactionDate: String(entry.transactionDate).slice(0, 10),
        amount: entry.amount,
        category: entry.category || '',
        description: entry.description || entry.remarks || '',
        paymentMethod: entry.paymentMethod === 'card' ? 'other' : (entry.paymentMethod || 'cash'),
        referenceNumber: entry.referenceNumber || '',
        partyName: entry.partyName || '',
        remarks: entry.remarks || '',
      });
      return;
    }
    reset({
      transactionDate: today(),
      amount: '',
      category: '',
      description: '',
      paymentMethod: 'cash',
      referenceNumber: '',
      partyName: '',
      remarks: '',
    });
  }, [isOpen, entry, reset]);

  const onSubmit = async (data) => {
    const payload = {
      bookSide: isJama ? 'jama' : 'karchulu',
      amount: Number(data.amount),
      category: data.category.trim(),
      description: data.description.trim(),
      paymentMethod: data.paymentMethod,
      transactionDate: data.transactionDate,
      referenceNumber: data.referenceNumber?.trim() || undefined,
      partyName: data.partyName?.trim() || undefined,
      remarks: data.remarks?.trim() || undefined,
    };

    try {
      if (isEdit) {
        await cashBookService.updateEntry(entry.id, payload);
        toast.success(isJama ? 'Jamalu updated' : 'Karchulu updated');
      } else {
        await cashBookService.createEntry(payload);
        toast.success(isJama ? 'Jamalu added to cash book' : 'Karchulu added to cash book');
      }
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save entry');
    }
  };

  if (!isOpen) return null;

  const title = isEdit
    ? (isJama ? 'Edit Jamalu' : 'Edit Karchulu')
    : (isJama ? 'Add Jamalu' : 'Add Karchulu');
  const accent = isJama ? 'text-emerald-700' : 'text-red-700';
  const buttonClass = isJama
    ? 'bg-emerald-600 hover:bg-emerald-700'
    : 'bg-red-600 hover:bg-red-700';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className={`text-lg font-bold ${accent}`}>{title}</h2>
          <p className="text-sm text-slate-500">
            {isJama ? 'Money received — added to cash balance' : 'Money spent — subtracted from cash balance'}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Date *</label>
              <input
                type="date"
                {...register('transactionDate', { required: 'Date is required' })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
              />
              {errors.transactionDate && <p className="mt-1 text-xs text-red-600">{errors.transactionDate.message}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Amount *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                {...register('amount', {
                  required: 'Amount is required',
                  min: { value: 0.01, message: 'Amount must be greater than 0' },
                })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
              />
              {errors.amount && <p className="mt-1 text-xs text-red-600">{errors.amount.message}</p>}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {isJama ? 'Jamalu Category' : 'Expense Category'} *
            </label>
            <input
              list="cashbook-category-options"
              {...register('category', { required: 'Category is required', minLength: 2 })}
              placeholder={isJama ? 'e.g. Other Income' : 'e.g. Electricity, Salary'}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
            />
            <datalist id="cashbook-category-options">
              {categoryOptions.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
            {errors.category && <p className="mt-1 text-xs text-red-600">{errors.category.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Description *</label>
            <input
              type="text"
              {...register('description', {
                required: 'Description is required',
                minLength: { value: 2, message: 'Enter a short description' },
              })}
              placeholder={isJama ? 'e.g. August fees' : 'e.g. Monthly electricity bill'}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
            />
            {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Payment Mode *</label>
              <select
                {...register('paymentMethod', { required: true })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
              >
                {METHOD_OPTIONS.map((method) => (
                  <option key={method.value} value={method.value}>{method.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Reference No.</label>
              <input
                type="text"
                {...register('referenceNumber')}
                placeholder="Optional"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              {isJama ? 'Party Name' : 'Party / Supplier'}
            </label>
            <input
              type="text"
              {...register('partyName')}
              placeholder="Optional"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
            <textarea
              {...register('remarks')}
              rows={2}
              placeholder="Optional notes..."
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
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-70 ${buttonClass}`}
            >
              {isSubmitting ? <LoadingSpinner size="sm" /> : (isEdit ? 'Save Changes' : 'Save Entry')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CashBookEntryModal;
