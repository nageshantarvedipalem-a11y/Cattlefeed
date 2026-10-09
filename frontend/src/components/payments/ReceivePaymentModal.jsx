import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import paymentService from '../../services/paymentService';
import { formatCurrency } from '../../utils/format';
import { catalogLabel } from '../../utils/catalogI18n';
import LoadingSpinner from '../common/LoadingSpinner';

const METHOD_OPTIONS = ['cash', 'upi'];

const ReceivePaymentModal = ({ isOpen, onClose, onSuccess, sale, customer }) => {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      amount: '',
      paymentMethod: 'cash',
      paymentDate: new Date().toISOString().slice(0, 10),
      referenceNumber: '',
      remarks: '',
      sendUpdatedBill: true,
    },
  });

  const target = sale || customer;
  const isCustomerPayment = Boolean(customer) && !sale;
  const amountValue = Number(watch('amount')) || 0;
  const thisBillPending = Number(sale?.pendingAmount) || Number(customer?.pendingAmount) || 0;
  const customerPendingTotal = Number(sale?.customerPendingTotal || customer?.pendingAmount) || thisBillPending;
  const maxPayable = Math.max(customerPendingTotal, thisBillPending);
  const remainingThisBill = Math.max(thisBillPending - amountValue, 0);
  const extraTowardOtherBills = Math.max(amountValue - thisBillPending, 0);

  useEffect(() => {
    if (isOpen && target) {
      reset({
        amount: isCustomerPayment ? customer.pendingAmount : sale.pendingAmount,
        paymentMethod: 'cash',
        paymentDate: new Date().toISOString().slice(0, 10),
        referenceNumber: '',
        remarks: '',
        sendUpdatedBill: true,
      });
    }
  }, [isOpen, sale, customer, isCustomerPayment, target, reset]);

  const onSubmit = async (data) => {
    try {
      const payload = {
        amount: Number(data.amount),
        paymentMethod: data.paymentMethod,
        paymentDate: data.paymentDate,
        referenceNumber: data.referenceNumber?.trim() || undefined,
        remarks: data.remarks?.trim() || undefined,
        sendUpdatedBill: Boolean(data.sendUpdatedBill),
      };
      if (sale?.id) payload.saleId = sale.id;
      else payload.customerId = customer.customerId;

      const response = await paymentService.receivePayment(payload);
      const result = response.data.data;
      const updatedSale = result.sale;
      const remaining = Number(updatedSale?.pendingAmount) || 0;
      const sent = Boolean(result.whatsapp?.sent);
      const fullyPaidCount = (result.allocations || []).filter((item) => item.fullyPaid).length;

      if (remaining <= 0) {
        toast.success(
          sent
            ? 'Fully paid. Invoice removed from pending. Updated bill sent on WhatsApp.'
            : 'Fully paid. Invoice removed from pending.'
        );
      } else if (fullyPaidCount > 0) {
        toast.success(
          sent
            ? `Payment applied. ${fullyPaidCount} bill(s) cleared. This bill pending is now ${formatCurrency(remaining)}. Updated bill sent.`
            : `Payment applied. ${fullyPaidCount} bill(s) cleared. This bill pending is now ${formatCurrency(remaining)}.`
        );
      } else {
        toast.success(
          sent
            ? `Pending reduced to ${formatCurrency(remaining)}. Updated bill sent on WhatsApp.`
            : `Pending reduced to ${formatCurrency(remaining)}.`
        );
      }

      if (data.sendUpdatedBill && result.whatsapp && !result.whatsapp.sent) {
        toast.error(result.whatsapp.reason || 'Payment saved, but updated bill could not be sent on WhatsApp');
      }

      onSuccess(result);
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to receive payment');
    }
  };

  if (!isOpen || !target) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">Receive Payment</h2>
          <p className="text-sm text-slate-500">
            {isCustomerPayment
              ? `${catalogLabel(customer.customerName, 'customers')} — ${customer.invoiceCount} pending bill${customer.invoiceCount === 1 ? '' : 's'}`
              : `${sale.invoiceNumber} — ${sale.customerName ? catalogLabel(sale.customerName, 'customers') : t('common.walkIn')}`}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6">
          <div className="rounded-lg bg-slate-50 p-4 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Total</span><span>{formatCurrency(target.totalAmount)}</span></div>
            <div className="mt-1 flex justify-between"><span className="text-slate-500">Paid</span><span>{formatCurrency(target.paidAmount)}</span></div>
            <div className="mt-1 flex justify-between font-semibold text-amber-700">
              <span>{isCustomerPayment ? 'Total Pending' : 'This Bill Pending'}</span>
              <span>{formatCurrency(thisBillPending)}</span>
            </div>
            {!isCustomerPayment && customerPendingTotal > thisBillPending + 0.01 && (
              <div className="mt-1 flex justify-between text-slate-600">
                <span>Customer Total Pending</span><span>{formatCurrency(customerPendingTotal)}</span>
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Amount *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={maxPayable}
              {...register('amount', {
                required: 'Amount is required',
                min: 0.01,
                max: { value: maxPayable, message: `Cannot exceed ${formatCurrency(maxPayable)}` },
              })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500"
            />
            {errors.amount && <p className="mt-1 text-xs text-red-600">{errors.amount.message}</p>}
            {amountValue > 0 && (
              <p className="mt-1 text-xs text-slate-500">
                {isCustomerPayment
                  ? (amountValue >= customerPendingTotal
                    ? 'All pending bills for this customer will be cleared.'
                    : `Remaining after this payment: ${formatCurrency(Math.max(customerPendingTotal - amountValue, 0))}. Oldest bills are paid first.`)
                  : remainingThisBill <= 0
                    ? 'This invoice will be fully paid and removed from Pending Payments.'
                    : `This invoice pending after payment: ${formatCurrency(remainingThisBill)}.`}
                {!isCustomerPayment && extraTowardOtherBills > 0
                  ? ` Extra ${formatCurrency(extraTowardOtherBills)} will reduce this customer's older pending bills.`
                  : ''}
              </p>
            )}
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

          <label className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="mt-0.5"
              {...register('sendUpdatedBill')}
            />
            <span>Generate the updated bill and send it to the customer on WhatsApp</span>
          </label>

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
