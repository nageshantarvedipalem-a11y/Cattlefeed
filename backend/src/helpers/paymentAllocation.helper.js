import {
  findCustomerPendingSalesForUpdate,
  createSalePaymentRecord,
  updateSalePaymentAmounts,
} from '../repositories/sale.repository.js';
import { createPaymentRecord } from '../repositories/payment.repository.js';
import {
  getLatestCustomerBalance,
  createLedgerEntry,
} from '../repositories/customerLedger.repository.js';

const resolvePaymentStatus = (paidAmount, totalAmount) => {
  if (paidAmount >= totalAmount) return 'paid';
  if (paidAmount > 0) return 'partial';
  return 'pending';
};

const sortPendingSales = (rows, preferSaleId = null) => {
  const preferredId = preferSaleId ? Number(preferSaleId) : null;
  const toTime = (value) => {
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? 0 : time;
  };
  const byAge = [...rows].sort((a, b) => {
    const dateCompare = toTime(a.sale_date) - toTime(b.sale_date);
    if (dateCompare !== 0) return dateCompare;
    return Number(a.id) - Number(b.id);
  });

  if (!preferredId) return byAge;

  const preferred = byAge.filter((row) => Number(row.id) === preferredId);
  const others = byAge.filter((row) => Number(row.id) !== preferredId);
  return [...preferred, ...others];
};

export const allocateAmountToPendingSales = async (connection, {
  customerId,
  amount,
  paymentMethod,
  paymentDate,
  referenceNumber = null,
  remarks = null,
  createdBy,
  preferSaleId = null,
  excludeSaleId = null,
  recordUnallocatedRemainder = false,
}) => {
  const paymentAmount = Number(amount);
  const empty = { allocated: 0, remaining: 0, updatedSales: [] };

  if (!customerId || paymentAmount <= 0) {
    return empty;
  }

  const pendingRows = await findCustomerPendingSalesForUpdate(
    connection,
    customerId,
    excludeSaleId
  );
  const orderedSales = sortPendingSales(pendingRows, preferSaleId);

  let remaining = paymentAmount;
  const updatedSales = [];
  let runningBalance = await getLatestCustomerBalance(connection, customerId);

  for (const sale of orderedSales) {
    if (remaining <= 0.01) break;

    const salePending = Number(sale.pending_amount);
    if (salePending <= 0) continue;

    const applied = Math.min(remaining, salePending);
    const newPaidAmount = Number(sale.paid_amount) + applied;
    const newPendingAmount = Math.max(salePending - applied, 0);
    const paymentStatus = resolvePaymentStatus(newPaidAmount, Number(sale.total_amount));

    await updateSalePaymentAmounts(connection, sale.id, {
      paidAmount: newPaidAmount,
      pendingAmount: newPendingAmount,
      paymentStatus,
    });

    await createSalePaymentRecord(connection, {
      saleId: sale.id,
      paymentMethod,
      amount: applied,
      referenceNumber,
    });

    const paymentId = await createPaymentRecord(connection, {
      customerId,
      saleId: sale.id,
      paymentDate,
      amount: applied,
      paymentMethod,
      referenceNumber,
      remarks: remarks || `Payment received for ${sale.invoice_number}`,
      createdBy,
    });

    runningBalance -= applied;
    await createLedgerEntry(connection, {
      customerId,
      transactionDate: paymentDate,
      transactionType: 'payment',
      referenceType: 'payment',
      referenceId: paymentId,
      debit: 0,
      credit: applied,
      balance: runningBalance,
      remarks: remarks || `Payment received for ${sale.invoice_number}`,
      createdBy,
    });

    updatedSales.push({
      id: sale.id,
      invoiceNumber: sale.invoice_number,
      applied,
      paidAmount: newPaidAmount,
      pendingAmount: newPendingAmount,
      paymentStatus,
      fullyPaid: newPendingAmount <= 0.01,
      paymentId,
    });

    remaining -= applied;
  }

  remaining = Math.max(remaining, 0);
  let leftoverPaymentId = null;

  if (recordUnallocatedRemainder && remaining > 0.01) {
    runningBalance -= remaining;
    leftoverPaymentId = await createPaymentRecord(connection, {
      customerId,
      saleId: null,
      paymentDate,
      amount: remaining,
      paymentMethod,
      referenceNumber,
      remarks: remarks || 'Customer pending payment',
      createdBy,
    });

    await createLedgerEntry(connection, {
      customerId,
      transactionDate: paymentDate,
      transactionType: 'payment',
      referenceType: 'payment',
      referenceId: leftoverPaymentId,
      debit: 0,
      credit: remaining,
      balance: runningBalance,
      remarks: remarks || 'Customer pending payment',
      createdBy,
    });

    remaining = 0;
  }

  const appliedToInvoices = updatedSales.reduce((sum, item) => sum + Number(item.applied), 0);

  return {
    allocated: appliedToInvoices,
    remaining,
    updatedSales,
    leftoverPaymentId,
  };
};

export { resolvePaymentStatus };
