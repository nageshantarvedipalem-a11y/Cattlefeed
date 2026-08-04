import { useEffect, useState } from 'react';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import LoadingSpinner from '../common/LoadingSpinner';

const paymentMethods = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'card', label: 'Card' },
  { value: 'bank', label: 'Bank' },
  { value: 'credit', label: 'Credit' },
];

const PaymentModal = ({
  isOpen,
  onClose,
  totalAmount,
  customerRequired,
  onConfirm,
  isSubmitting,
}) => {
  const [payments, setPayments] = useState([{ paymentMethod: 'cash', amount: totalAmount, referenceNumber: '' }]);

  useEffect(() => {
    if (isOpen) {
      setPayments([{ paymentMethod: 'cash', amount: totalAmount, referenceNumber: '' }]);
    }
  }, [isOpen, totalAmount]);

  if (!isOpen) return null;

  const paidTotal = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const pending = Math.max(totalAmount - paidTotal, 0);
  const hasCredit = payments.some((p) => p.paymentMethod === 'credit');

  const updatePayment = (index, field, value) => {
    setPayments((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  };

  const addPayment = () => {
    setPayments((prev) => [...prev, { paymentMethod: 'cash', amount: Math.max(pending, 0), referenceNumber: '' }]);
  };

  const removePayment = (index) => {
    setPayments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirm = () => {
    onConfirm(payments.map((p) => ({
      paymentMethod: p.paymentMethod,
      amount: Number(p.amount),
      referenceNumber: p.referenceNumber?.trim() || undefined,
    })));
  };

  const canSubmit = paidTotal > 0 && paidTotal <= totalAmount + 0.01
    && (!hasCredit || customerRequired)
    && (pending === 0 || customerRequired);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900">Payment</h2>
          <p className="text-sm text-slate-500">Total: ₹{totalAmount.toFixed(2)}</p>
        </div>

        <div className="space-y-3 p-6">
          {payments.map((payment, index) => (
            <div key={index} className="grid gap-2 rounded-lg border border-slate-200 p-3 sm:grid-cols-4">
              <select
                value={payment.paymentMethod}
                onChange={(e) => updatePayment(index, 'paymentMethod', e.target.value)}
                className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
              >
                {paymentMethods.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <input
                type="number"
                step="0.01"
                min="0"
                value={payment.amount}
                onChange={(e) => updatePayment(index, 'amount', e.target.value)}
                className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                placeholder="Amount"
              />
              <input
                value={payment.referenceNumber}
                onChange={(e) => updatePayment(index, 'referenceNumber', e.target.value)}
                className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                placeholder="Ref #"
              />
              {payments.length > 1 && (
                <button type="button" onClick={() => removePayment(index)} className="rounded-lg p-2 text-red-500 hover:bg-red-50">
                  <FiTrash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}

          <button type="button" onClick={addPayment} className="inline-flex items-center gap-1 text-sm font-medium text-primary-700 hover:text-primary-800">
            <FiPlus className="h-4 w-4" /> Add Split Payment
          </button>

          <div className="rounded-lg bg-slate-50 p-3 text-sm">
            <div className="flex justify-between"><span>Paid</span><span>₹{paidTotal.toFixed(2)}</span></div>
            <div className="flex justify-between font-medium text-amber-700"><span>Pending</span><span>₹{pending.toFixed(2)}</span></div>
          </div>

          {pending > 0 && !customerRequired && (
            <p className="text-xs text-red-600">Select a customer for partial/credit payments.</p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canSubmit || isSubmitting}
            className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
          >
            {isSubmitting ? <LoadingSpinner size="sm" /> : 'Complete Sale'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
