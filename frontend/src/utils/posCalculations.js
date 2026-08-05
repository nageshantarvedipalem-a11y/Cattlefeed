export const calculateCartLine = (item) => {
  const quantity = Number(item.quantity) || 0;
  const sellingPrice = Number(item.sellingPrice) || 0;
  const gstRate = Number(item.gstRate) || 0;
  const discountAmount = Number(item.discountAmount) || 0;
  const lineSubtotal = quantity * sellingPrice;
  const taxable = Math.max(lineSubtotal - discountAmount, 0);
  const taxAmount = (taxable * gstRate) / 100;
  const totalAmount = taxable + taxAmount;

  return { lineSubtotal, taxAmount, totalAmount };
};

export const calculateBillTotals = (cart, billDiscount = 0) => {
  let subtotal = 0;
  let tax = 0;

  cart.forEach((item) => {
    const line = calculateCartLine(item);
    subtotal += line.lineSubtotal;
    tax += line.taxAmount;
  });

  const discount = Number(billDiscount) || 0;
  const grandTotal = Math.max(subtotal + tax - discount, 0);

  return { subtotal, tax, discount, grandTotal };
};

export const resolvePaymentStatus = (paidAmount, grandTotal) => {
  if (paidAmount >= grandTotal) return 'PAID';
  if (paidAmount > 0) return 'PARTIALLY PAID';
  return 'CREDIT';
};

export const buildSalePayments = (paymentMethod, paidAmount, grandTotal) => {
  const paid = Number(paidAmount) || 0;
  const total = Number(grandTotal) || 0;

  if (paymentMethod === 'credit') {
    return [{ paymentMethod: 'credit', amount: total }];
  }

  if (paid <= 0) {
    return [{ paymentMethod: 'cash', amount: total }];
  }

  if (paid >= total) {
    return [{ paymentMethod: paymentMethod === 'upi' ? 'upi' : 'cash', amount: total }];
  }

  return [{ paymentMethod: paymentMethod === 'upi' ? 'upi' : 'cash', amount: paid }];
};

export const formatPaymentStatus = (status, paidAmount = 0) => {
  if (status === 'paid') return 'PAID';
  if (status === 'partial') return 'PARTIALLY PAID';
  if (status === 'pending' && Number(paidAmount) === 0) return 'CREDIT';
  return String(status || '').toUpperCase();
};
