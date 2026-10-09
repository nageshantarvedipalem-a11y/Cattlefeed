import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import supplierService from '../../services/supplierService';
import { formatCurrency } from '../../utils/format';
import { catalogLabel } from '../../utils/catalogI18n';
import LoadingSpinner from '../common/LoadingSpinner';

const METHOD_OPTIONS = [
  { value: 'cash', labelKey: 'common.cash' },
  { value: 'upi', labelKey: 'common.upi' },
  { value: 'bank', labelKey: 'common.bank' },
  { value: 'other', labelKey: 'common.other' },
];

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Record a later payment against a specific stock-in (purchase) invoice.
 * Updates purchase paid amount + supplier pending + cash book.
 */
const PurchasePayModal = ({ isOpen, onClose, onSuccess, purchase }) => {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      paymentDate: today(),
      amount: '',
      paymentMethod: 'cash',
      referenceNumber: '',
      remarks: '',
    },
  });

  const pending = Math.max(
    0,
    Number(purchase?.totalAmount || 0) - Number(purchase?.paidAmount || 0)
  );

  useEffect(() => {
    if (!isOpen || !purchase) return;
    reset({
      paymentDate: today(),
      amount: pending > 0 ? String(pending) : '',
      paymentMethod: 'cash',
      referenceNumber: purchase.invoiceNumber || '',
      remarks: '',
    });
  }, [isOpen, purchase, pending, reset]);

  const onSubmit = async (data) => {
    if (!purchase?.supplierId) {
      toast.error(t('stock.payMissingSupplier'));
      return;
    }
    try {
      await supplierService.paySupplier(purchase.supplierId, {
        amount: Number(data.amount),
        paymentMethod: data.paymentMethod,
        paymentDate: data.paymentDate,
        purchaseId: purchase.id,
        referenceNumber: data.referenceNumber?.trim() || purchase.invoiceNumber,
        remarks: data.remarks?.trim()
          || t('stock.payPurchaseRemark', { invoice: purchase.invoiceNumber }),
      });
      toast.success(t('stock.paySuccess'));
      onSuccess?.();
      onClose?.();
    } catch (error) {
      toast.error(error.response?.data?.message || t('stock.payFailed'));
    }
  };

  if (!isOpen || !purchase) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-bold text-emerald-800">{t('stock.payPurchaseTitle')}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {purchase.invoiceNumber} · {catalogLabel(purchase.supplierName, 'suppliers')}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {t('common.total')}: {formatCurrency(purchase.totalAmount)} · {t('common.paid')}: {formatCurrency(purchase.paidAmount)} · {t('common.pending')}: {formatCurrency(pending)}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{t('common.date')} *</label>
              <input
                type="date"
                {...register('paymentDate', { required: true })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{t('common.amount')} *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                {...register('amount', {
                  required: t('stock.amountRequired'),
                  min: { value: 0.01, message: t('stock.amountRequired') },
                  validate: (value) => Number(value) <= pending + 0.01 || t('stock.cannotExceedPending'),
                })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
              />
              {errors.amount && <p className="mt-1 text-xs text-red-600">{errors.amount.message}</p>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{t('common.method')} *</label>
              <select
                {...register('paymentMethod', { required: true })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
              >
                {METHOD_OPTIONS.map((method) => (
                  <option key={method.value} value={method.value}>
                    {t(method.labelKey, { defaultValue: method.value })}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{t('common.reference')}</label>
              <input
                type="text"
                {...register('referenceNumber')}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{t('common.remarks')}</label>
            <textarea
              {...register('remarks')}
              rows={2}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || pending <= 0}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-70"
            >
              {isSubmitting ? <LoadingSpinner size="sm" /> : t('stock.recordPayment')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PurchasePayModal;
