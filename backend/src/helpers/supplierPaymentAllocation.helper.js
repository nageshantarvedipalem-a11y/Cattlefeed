import {
  findSupplierPendingPurchasesForUpdate,
  updatePurchasePaymentAmounts,
} from '../repositories/purchase.repository.js';

const resolvePaymentStatus = (paidAmount, totalAmount) => {
  if (paidAmount >= totalAmount) return 'paid';
  if (paidAmount > 0) return 'partial';
  return 'pending';
};

export const allocateAmountToPendingPurchases = async (connection, {
  supplierId,
  amount,
}) => {
  const paymentAmount = Number(amount);
  const empty = { allocated: 0, remaining: paymentAmount, updatedPurchases: [] };

  if (!supplierId || paymentAmount <= 0) {
    return empty;
  }

  const pendingRows = await findSupplierPendingPurchasesForUpdate(connection, supplierId);
  let remaining = paymentAmount;
  const updatedPurchases = [];

  for (const purchase of pendingRows) {
    if (remaining <= 0.01) break;

    const pending = Number(purchase.total_amount) - Number(purchase.paid_amount);
    if (pending <= 0) continue;

    const applied = Math.min(remaining, pending);
    const newPaidAmount = Number(purchase.paid_amount) + applied;
    const paymentStatus = resolvePaymentStatus(newPaidAmount, Number(purchase.total_amount));

    await updatePurchasePaymentAmounts(connection, purchase.id, {
      paidAmount: newPaidAmount,
      paymentStatus,
    });

    updatedPurchases.push({
      id: purchase.id,
      invoiceNumber: purchase.invoice_number,
      applied,
      paidAmount: newPaidAmount,
      pendingAmount: Number(purchase.total_amount) - newPaidAmount,
      paymentStatus,
    });

    remaining -= applied;
  }

  return {
    allocated: updatedPurchases.reduce((sum, item) => sum + Number(item.applied), 0),
    remaining: Math.max(remaining, 0),
    updatedPurchases,
  };
};
