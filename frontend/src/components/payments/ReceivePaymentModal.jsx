import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import paymentService from '../../services/paymentService';
import { formatCurrency } from '../../utils/format';
import LoadingSpinner from '../common/LoadingSpinner';

const METHOD_OPTIONS = ['cash', 'upi', 'card', 'bank'];

const ReceivePaymentModal = ({ isOpen, onClose, onSuccess, sale }) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      amount: '',
      paymentMethod: 'cash',
      paymentDate: new Date().toISOString().slice(0, 10),
      referenceNumber: '',
      remarks: '',
    },
  });

  useEffect(() => {
    if (isOpen && sale) {
      reset({
        amount: sale.pendingAmount,
        paymentMethod: 'cash',
        paymentDate: new Date().toISOString().slice(0, 10),
        referenceNumber: '',
        remarks: '',
      });
    }
  }, [isOpen, sale, reset]);

  const onSubmit = async (data) => {
    try {
      const response = await paymentService.receivePayment({
        saleId: sale.id,
        amount: Number(data.amount),
        paymentMethod: data.paymentMethod,
        paymentDate: data.paymentDate,
        referenceNumber: data.referenceNumber?.trim() || undefined,
        remarks: data.remarks?.trim() || undefined,
      });
      toast.success('Payment received successfully');
      onSuccess(response.data.data);
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to receive payment');
    }
  };

  if (!isOpen || !sale) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">Receive Payment</h2>
          <p className="text-sm text-slate-500">{sale.invoiceNumber} — {sale.customerName}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6">
          <div className="rounded-lg bg-slate-50 p-4 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Total</span><span>{formatCurrency(sale.totalAmount)}</span></div>
            <div className="mt-1 flex justify-between"><span className="text-slate-500">Paid</span><span>{formatCurrency(sale.paidAmount)}</span></div>
            <div className="mt-1 flex justify-between font-semibold text-amber-700">
              <span>Pending</span><span>{formatCurrency(sale.pendingAmount)}</span>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Amount *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={sale.pendingAmount}
              {...register('amount', {
                required: 'Amount is required',
                min: 0.01,
                max: { value: sale.pendingAmount, message: `Cannot exceed ${formatCurrency(sale.pendingAmount)}` },
              })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
            />
            {errors.amount && <p className="mt-1 text-xs text-red-600">{errors.amount.message}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Method *</label>
              <select
                {...register('paymentMethod', { required: true })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
              >
                {METHOD_OPTIONS.map((method) => (
                  <option key={method} value={method}>{method.toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Date *</label>
              <input
                type="date"
                {...register('paymentDate', { required: true })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Reference No.</label>
            <input
              type="text"
              {...register('referenceNumber')}
              placeholder="UPI ref, cheque no., etc."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Remarks</label>
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
              className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-70"
            >
              {isSubmitting ? <LoadingSpinner size="sm" /> : 'Receive Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReceivePaymentModal;
