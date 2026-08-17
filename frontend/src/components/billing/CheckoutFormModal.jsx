import { useCallback, useEffect, useState } from 'react';
import customerService from '../../services/customerService';
import { formatCurrency } from '../../utils/format';
import { sanitizePhoneInput, validateIndianMobile } from '../../utils/phoneValidation';
import LoadingSpinner from '../common/LoadingSpinner';

const paymentMethods = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'credit', label: 'Credit' },
];

const CheckoutFormModal = ({
  isOpen,
  onClose,
  customer,
  onCustomerChange,
  customerMode,
  onCustomerModeChange,
  selectedCustomerId,
  onSelectExistingCustomer,
  onClearSelectedCustomer,
  previousPendingBalance,
  paymentAllocation,
  paymentMethod,
  onPaymentMethodChange,
  paidAmount,
  onPaidAmountChange,
  totals,
  effectivePaidAmount,
  pendingAmount,
  rawPendingAmount = 0,
  balanceReturn,
  paymentStatus,
  trackPendingBalance,
  onTrackPendingBalanceChange,
  onSubmit,
  isSubmitting,
}) => {
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [customerSearchLoading, setCustomerSearchLoading] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  const phoneCheck = customer.phone ? validateIndianMobile(customer.phone) : null;
  const phoneError = customerMode === 'new' && customer.phone && phoneCheck && !phoneCheck.valid
    ? phoneCheck.error
    : null;

  const maxPayable = totals.grandTotal + (selectedCustomerId ? previousPendingBalance : 0);
  const showAllocation = selectedCustomerId && (
    previousPendingBalance > 0
    || paymentAllocation.oldBalancePaid > 0
    || effectivePaidAmount > totals.grandTotal
  );

  const fetchCustomers = useCallback(async (searchTerm) => {
    if (!searchTerm.trim()) {
      setCustomerResults([]);
      return;
    }

    setCustomerSearchLoading(true);
    try {
      const response = await customerService.getCustomers({
        search: searchTerm.trim(),
        limit: 15,
        isActive: true,
        sortBy: 'name',
        sortOrder: 'asc',
      });
      setCustomerResults(response.data.data || []);
    } catch {
      setCustomerResults([]);
    } finally {
      setCustomerSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    if (customerMode !== 'existing' || selectedCustomerId) return undefined;

    const timer = setTimeout(() => fetchCustomers(customerSearch), 300);
    return () => clearTimeout(timer);
  }, [customerSearch, customerMode, selectedCustomerId, fetchCustomers]);

  useEffect(() => {
    if (!isOpen) {
      setCustomerSearch('');
      setCustomerResults([]);
      setShowCustomerDropdown(false);
    }
  }, [isOpen]);

  const handleSelectCustomer = (row) => {
    onSelectExistingCustomer(row);
    setCustomerSearch('');
    setCustomerResults([]);
    setShowCustomerDropdown(false);
  };

  if (!isOpen) return null;

  const submitDisabled = isSubmitting
    || Boolean(phoneError)
    || (customerMode === 'existing' && !selectedCustomerId)
    || (customerMode === 'new' && (!customer.name.trim() || !customer.phone.trim()));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-slate-200 px-6 py-4">
          <p className="text-xs uppercase tracking-wide text-emerald-600">Step 3 — Checkout</p>
          <h2 className="text-xl font-bold text-slate-900">Customer & Payment</h2>
          <p className="mt-1 text-sm text-slate-500">Invoice will be sent to WhatsApp after bill is generated</p>
        </div>

        <div className="space-y-4 px-6 py-4">
          <div className="rounded-xl bg-emerald-50 px-4 py-3 text-center">
            <p className="text-xs uppercase text-emerald-700">New Purchase Amount</p>
            <p className="text-2xl font-bold text-emerald-800">{formatCurrency(totals.grandTotal)}</p>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-slate-600">Customer Type</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onCustomerModeChange('existing')}
                className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                  customerMode === 'existing'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Existing Customer
              </button>
              <button
                type="button"
                onClick={() => onCustomerModeChange('new')}
                className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                  customerMode === 'new'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                New Customer
              </button>
            </div>
          </div>

          {customerMode === 'existing' ? (
            <div className="space-y-3">
              {!selectedCustomerId ? (
                <div className="relative">
                  <label className="mb-1 block text-xs font-medium text-slate-600">Search Customer *</label>
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setShowCustomerDropdown(true);
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    placeholder="Type name, phone, or village"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
                  />
                  {showCustomerDropdown && (customerSearchLoading || customerResults.length > 0) && (
                    <div className="absolute z-10 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                      {customerSearchLoading ? (
                        <p className="px-3 py-3 text-xs text-slate-500">Searching...</p>
                      ) : (
                        customerResults.map((row) => (
                          <button
                            key={row.id}
                            type="button"
                            onClick={() => handleSelectCustomer(row)}
                            className="flex w-full flex-col items-start border-b border-slate-100 px-3 py-2.5 text-left hover:bg-emerald-50 last:border-b-0"
                          >
                            <span className="text-sm font-medium text-slate-900">{row.name}</span>
                            <span className="text-xs text-slate-500">
                              {row.phone}
                              {row.village ? ` · ${row.village}` : ''}
                              {Number(row.currentBalance) > 0
                                ? ` · Pending ${formatCurrency(row.currentBalance)}`
                                : ''}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                  {!customerSearchLoading && customerSearch.trim() && customerResults.length === 0 && showCustomerDropdown && (
                    <p className="mt-1 text-xs text-amber-700">
                      No customer found. Switch to <strong>New Customer</strong> to create a bill.
                    </p>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-emerald-900">{customer.name}</p>
                      <p className="text-xs text-emerald-800">{customer.phone}</p>
                      {(customer.village || customer.address) && (
                        <p className="mt-1 text-xs text-emerald-700">
                          {[customer.village, customer.address].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={onClearSelectedCustomer}
                      className="text-xs font-medium text-emerald-700 underline"
                    >
                      Change
                    </button>
                  </div>
                  {previousPendingBalance > 0 && (
                    <p className="mt-2 rounded-lg bg-amber-100 px-2 py-1.5 text-xs font-medium text-amber-900">
                      Previous pending balance: {formatCurrency(previousPendingBalance)}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-600">Customer Name *</label>
                <input
                  type="text"
                  value={customer.name}
                  onChange={(e) => onCustomerChange({ ...customer, name: e.target.value })}
                  placeholder="Enter customer name"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-600">WhatsApp Mobile Number *</label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={customer.phone}
                  onChange={(e) => onCustomerChange({ ...customer, phone: sanitizePhoneInput(e.target.value) })}
                  placeholder="10-digit mobile (e.g. 9123456789)"
                  className={`w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-1 ${
                    phoneError
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
                      : 'border-slate-300 focus:border-emerald-500 focus:ring-emerald-200'
                  }`}
                />
                {phoneError ? (
                  <p className="mt-1 text-xs text-red-600">{phoneError}</p>
                ) : (
                  <p className="mt-1 text-xs text-slate-400">
                    Customer&apos;s personal WhatsApp number (10 digits).
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Village (optional)</label>
                <input
                  type="text"
                  value={customer.village}
                  onChange={(e) => onCustomerChange({ ...customer, village: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Address (optional)</label>
                <input
                  type="text"
                  value={customer.address}
                  onChange={(e) => onCustomerChange({ ...customer, address: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Payment Type *</label>
              <select
                value={paymentMethod}
                onChange={(e) => onPaymentMethodChange(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500"
              >
                {paymentMethods.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Amount Received *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={paymentMethod === 'credit' ? 0 : paidAmount}
                disabled={paymentMethod === 'credit'}
                onChange={(e) => onPaidAmountChange(e.target.value)}
                placeholder={String(totals.grandTotal)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-emerald-500 disabled:bg-slate-100"
              />
              {selectedCustomerId && previousPendingBalance > 0 && paymentMethod !== 'credit' && (
                <p className="mt-1 text-xs text-slate-500">
                  Can pay up to {formatCurrency(maxPayable)} (new bill + old pending).
                </p>
              )}
            </div>
          </div>

          {paymentMethod !== 'credit' && rawPendingAmount > 0 && (
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
              <input
                type="checkbox"
                checked={trackPendingBalance}
                onChange={(e) => onTrackPendingBalanceChange(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span>
                <span className="block text-sm font-medium text-slate-800">
                  Add unpaid balance to Pending Payments
                </span>
                <span className="mt-1 block text-xs text-slate-500">
                  Uncheck for friends or relatives — the remaining {formatCurrency(rawPendingAmount)} will be treated as a discount and the bill will be marked as fully paid.
                </span>
              </span>
            </label>
          )}

          {showAllocation && (
            <div className="space-y-2 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">Payment Breakdown</p>
              {previousPendingBalance > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Previous Pending</span>
                  <span className="font-medium">{formatCurrency(previousPendingBalance)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-600">New Purchase</span>
                <span className="font-medium">{formatCurrency(totals.grandTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Amount Received</span>
                <span className="font-medium">{formatCurrency(effectivePaidAmount)}</span>
              </div>
              {paymentAllocation.paidOnNewBill > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Paid on This Bill</span>
                  <span className="font-medium">{formatCurrency(paymentAllocation.paidOnNewBill)}</span>
                </div>
              )}
              {paymentAllocation.oldBalancePaid > 0 && (
                <div className="flex justify-between">
                  <span className="text-slate-600">Paid to Old Balance</span>
                  <span className="font-medium text-emerald-700">{formatCurrency(paymentAllocation.oldBalancePaid)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-sky-200 pt-2">
                <span className="font-medium text-slate-700">Total Pending Now</span>
                <span className="font-bold text-amber-700">{formatCurrency(paymentAllocation.totalPendingAfter)}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
            <div>
              <p className="text-xs text-slate-500">This Bill Pending</p>
              <p className="font-semibold text-amber-700">{formatCurrency(pendingAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Balance Return</p>
              <p className="font-semibold text-emerald-700">{formatCurrency(balanceReturn)}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-slate-500">Payment Status</p>
              <p className="font-bold uppercase text-slate-800">{paymentStatus}</p>
            </div>
          </div>

          {paymentStatus !== 'PAID' && trackPendingBalance && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Partial payment — customer will appear in <strong>Pending Payments</strong> until fully paid.
            </p>
          )}
          {!trackPendingBalance && rawPendingAmount > 0 && (
            <p className="rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-800">
              Friend/relative discount — remaining {formatCurrency(rawPendingAmount)} will <strong>not</strong> be added to pending balance.
            </p>
          )}
          {paymentStatus === 'PAID' && trackPendingBalance && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              Full payment — bill will be marked as <strong>PAID</strong> and saved to customer records.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Back
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={submitDisabled}
            className="inline-flex h-10 min-w-[140px] items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {isSubmitting ? <LoadingSpinner size="sm" /> : 'Generate Bill'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutFormModal;
