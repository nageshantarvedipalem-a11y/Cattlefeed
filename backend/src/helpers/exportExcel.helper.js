import ExcelJS from 'exceljs';

export const buildStockHistoryWorkbook = async (movements, filters = {}) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Stock History');

  sheet.columns = [
    { header: 'Date', key: 'date', width: 20 },
    { header: 'Product', key: 'product', width: 30 },
    { header: 'SKU', key: 'sku', width: 16 },
    { header: 'Type', key: 'type', width: 10 },
    { header: 'Reference', key: 'reference', width: 18 },
    { header: 'Quantity', key: 'quantity', width: 12 },
    { header: 'Balance After', key: 'balanceAfter', width: 14 },
    { header: 'Purchase Price', key: 'purchasePrice', width: 14 },
    { header: 'Selling Price', key: 'sellingPrice', width: 14 },
    { header: 'Remarks', key: 'remarks', width: 30 },
    { header: 'Created By', key: 'createdBy', width: 20 },
  ];

  sheet.getRow(1).font = { bold: true };

  movements.forEach((movement) => {
    sheet.addRow({
      date: new Date(movement.createdAt).toLocaleString('en-IN'),
      product: movement.productName,
      sku: movement.productSku,
      type: movement.movementType.toUpperCase(),
      reference: `${movement.referenceType}${movement.referenceId ? ` #${movement.referenceId}` : ''}`,
      quantity: movement.quantity,
      balanceAfter: movement.balanceAfter,
      purchasePrice: movement.purchasePrice ?? '',
      sellingPrice: movement.sellingPrice ?? '',
      remarks: movement.remarks || '',
      createdBy: movement.createdByName || '',
    });
  });

  if (filters.period || filters.dateFrom) {
    sheet.addRow([]);
    sheet.addRow({
      date: 'Filters',
      product: [
        filters.period ? `Period: ${filters.period}` : null,
        filters.dateFrom ? `From: ${filters.dateFrom}` : null,
        filters.dateTo ? `To: ${filters.dateTo}` : null,
        filters.search ? `Search: ${filters.search}` : null,
      ].filter(Boolean).join(' | '),
    });
  }

  return workbook;
};

export const buildLowStockWorkbook = async (products) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Low Stock Alert');

  sheet.columns = [
    { header: 'Product', key: 'name', width: 30 },
    { header: 'SKU', key: 'sku', width: 16 },
    { header: 'Category', key: 'category', width: 18 },
    { header: 'Current Stock', key: 'currentStock', width: 14 },
    { header: 'Minimum Stock', key: 'minStock', width: 14 },
    { header: 'Selling Price', key: 'sellingPrice', width: 14 },
  ];

  sheet.getRow(1).font = { bold: true };

  products.forEach((product) => {
    sheet.addRow({
      name: product.name,
      sku: product.sku,
      category: product.categoryName || '',
      currentStock: product.currentStock,
      minStock: product.minStock,
      sellingPrice: product.sellingPrice,
    });
  });

  return workbook;
};

export const buildCashBookWorkbook = async (entries, summary = null) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Cash Book');

  sheet.columns = [
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Type', key: 'type', width: 12 },
    { header: 'Category', key: 'category', width: 18 },
    { header: 'Method', key: 'method', width: 10 },
    { header: 'Amount', key: 'amount', width: 12 },
    { header: 'Balance', key: 'balance', width: 12 },
    { header: 'Reference', key: 'reference', width: 16 },
    { header: 'Remarks', key: 'remarks', width: 30 },
  ];

  sheet.getRow(1).font = { bold: true };

  if (summary) {
    sheet.addRow({ date: 'Opening Balance', balance: summary.openingBalance });
    sheet.addRow({ date: 'Total Inflow', amount: summary.totalInflow });
    sheet.addRow({ date: 'Total Outflow', amount: summary.totalOutflow });
    sheet.addRow({});
  }

  entries.forEach((entry) => {
    sheet.addRow({
      date: entry.transactionDate,
      type: entry.transactionType,
      category: entry.category || '',
      method: entry.paymentMethod,
      amount: entry.amount,
      balance: entry.balanceAfter,
      reference: `${entry.referenceType || ''}${entry.referenceId ? ` #${entry.referenceId}` : ''}`,
      remarks: entry.remarks || '',
    });
  });

  if (summary) {
    sheet.addRow({});
    sheet.addRow({ date: 'Closing Balance', balance: summary.closingBalance });
  }

  return workbook;
};

export const buildLedgerWorkbook = async (entries, summary = null) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Customer Ledger');

  sheet.columns = [
    { header: 'Date', key: 'date', width: 20 },
    { header: 'Customer', key: 'customer', width: 24 },
    { header: 'Type', key: 'type', width: 12 },
    { header: 'Reference', key: 'reference', width: 18 },
    { header: 'Debit', key: 'debit', width: 12 },
    { header: 'Credit', key: 'credit', width: 12 },
    { header: 'Balance', key: 'balance', width: 12 },
    { header: 'Remarks', key: 'remarks', width: 30 },
  ];

  sheet.getRow(1).font = { bold: true };

  if (summary?.customer) {
    sheet.addRow({ date: 'Customer', customer: summary.customer.name });
    sheet.addRow({ date: 'Opening Balance', balance: summary.openingBalance });
    sheet.addRow({ date: 'Pending Amount', balance: summary.pendingAmount });
    sheet.addRow({});
  }

  entries.forEach((entry) => {
    sheet.addRow({
      date: new Date(entry.transactionDate).toLocaleString('en-IN'),
      customer: entry.customerName,
      type: entry.transactionType,
      reference: `${entry.referenceType || ''}${entry.referenceId ? ` #${entry.referenceId}` : ''}`,
      debit: entry.debit || '',
      credit: entry.credit || '',
      balance: entry.balance,
      remarks: entry.remarks || '',
    });
  });

  if (summary) {
    sheet.addRow({});
    sheet.addRow({ date: 'Total Debit', debit: summary.totalDebit });
    sheet.addRow({ date: 'Total Credit', credit: summary.totalCredit });
    sheet.addRow({ date: 'Closing Balance', balance: summary.closingBalance });
  }

  return workbook;
};

export const buildPendingPaymentsWorkbook = async (pendingSales, summary = null) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Pending Payments');

  sheet.columns = [
    { header: 'Invoice', key: 'invoice', width: 14 },
    { header: 'Customer', key: 'customer', width: 24 },
    { header: 'Phone', key: 'phone', width: 14 },
    { header: 'Sale Date', key: 'saleDate', width: 14 },
    { header: 'Total', key: 'total', width: 12 },
    { header: 'Paid', key: 'paid', width: 12 },
    { header: 'Pending', key: 'pending', width: 12 },
    { header: 'Due Date', key: 'dueDate', width: 14 },
    { header: 'Status', key: 'status', width: 10 },
  ];

  sheet.getRow(1).font = { bold: true };

  if (summary) {
    sheet.addRow({ invoice: 'Total Pending', pending: summary.totalPending });
    sheet.addRow({ invoice: 'Overdue Amount', pending: summary.overdueAmount });
    sheet.addRow({});
  }

  pendingSales.forEach((sale) => {
    sheet.addRow({
      invoice: sale.invoiceNumber,
      customer: sale.customerName,
      phone: sale.customerPhone || '',
      saleDate: sale.saleDate,
      total: sale.totalAmount,
      paid: sale.paidAmount,
      pending: sale.pendingAmount,
      dueDate: sale.dueDate || '',
      status: sale.paymentStatus,
    });
  });

  return workbook;
};

export const buildProfitWorkbook = async (entries, meta = {}) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Profit Report');

  sheet.columns = [
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Invoice', key: 'invoice', width: 14 },
    { header: 'Customer', key: 'customer', width: 20 },
    { header: 'Product', key: 'product', width: 24 },
    { header: 'Qty', key: 'qty', width: 8 },
    { header: 'Cost', key: 'cost', width: 12 },
    { header: 'Revenue', key: 'revenue', width: 12 },
    { header: 'Profit', key: 'profit', width: 12 },
  ];

  sheet.getRow(1).font = { bold: true };

  if (meta.summary) {
    sheet.addRow({ date: "Today's Profit", profit: meta.summary.today.profit });
    sheet.addRow({ date: 'Monthly Profit', profit: meta.summary.monthly.profit });
    sheet.addRow({ date: 'Yearly Profit', profit: meta.summary.yearly.profit });
    sheet.addRow({ date: 'Overall Profit', profit: meta.summary.overall.profit });
    sheet.addRow({});
  }

  if (meta.filteredTotals) {
    sheet.addRow({ date: 'Filtered Profit', profit: meta.filteredTotals.profit });
    sheet.addRow({});
  }

  entries.forEach((entry) => {
    sheet.addRow({
      date: entry.saleDate,
      invoice: entry.invoiceNumber,
      customer: entry.customerName,
      product: entry.productName,
      qty: entry.quantity,
      cost: entry.costAmount,
      revenue: entry.totalAmount,
      profit: entry.profitAmount,
    });
  });

  return workbook;
};

export const buildSummaryReportWorkbook = async (summary) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Summary');
  sheet.columns = [
    { header: 'Metric', key: 'metric', width: 24 },
    { header: 'Count', key: 'count', width: 14 },
    { header: 'Amount', key: 'amount', width: 14 },
  ];
  sheet.getRow(1).font = { bold: true };
  sheet.addRow({ metric: 'Sales', count: summary.sales.count, amount: summary.sales.total });
  sheet.addRow({ metric: 'Purchases', count: summary.purchases.count, amount: summary.purchases.total });
  sheet.addRow({ metric: 'Profit', count: '', amount: summary.profit.amount });
  sheet.addRow({ metric: 'Payments Received', count: summary.payments.count, amount: summary.payments.total });
  sheet.addRow({ metric: 'Cash Inflow', count: '', amount: summary.cashBook.inflow });
  sheet.addRow({ metric: 'Cash Outflow', count: '', amount: summary.cashBook.outflow });
  sheet.addRow({ metric: 'Outstanding Pending', count: summary.outstanding.pendingInvoices, amount: summary.outstanding.pendingAmount });
  sheet.addRow({ metric: 'Active Customers', count: summary.customers.active, amount: '' });
  sheet.addRow({ metric: 'Low Stock Products', count: summary.stock.lowStockProducts, amount: '' });
  return workbook;
};

export const buildSalesReportWorkbook = async (sales) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Sales');
  sheet.columns = [
    { header: 'Invoice', key: 'invoice', width: 14 },
    { header: 'Customer', key: 'customer', width: 20 },
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Total', key: 'total', width: 12 },
    { header: 'Paid', key: 'paid', width: 12 },
    { header: 'Pending', key: 'pending', width: 12 },
    { header: 'Status', key: 'status', width: 10 },
  ];
  sheet.getRow(1).font = { bold: true };
  sales.forEach((s) => {
    sheet.addRow({
      invoice: s.invoiceNumber,
      customer: s.customerName || 'Walk-in',
      date: s.saleDate,
      total: s.totalAmount,
      paid: s.paidAmount,
      pending: s.pendingAmount,
      status: s.paymentStatus,
    });
  });
  return workbook;
};

export const buildPurchasesReportWorkbook = async (purchases) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Purchases');
  sheet.columns = [
    { header: 'Invoice', key: 'invoice', width: 14 },
    { header: 'Supplier', key: 'supplier', width: 24 },
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Total', key: 'total', width: 12 },
    { header: 'Paid', key: 'paid', width: 12 },
    { header: 'Status', key: 'status', width: 10 },
  ];
  sheet.getRow(1).font = { bold: true };
  purchases.forEach((p) => {
    sheet.addRow({
      invoice: p.invoiceNumber,
      supplier: p.supplierName,
      date: p.purchaseDate,
      total: p.totalAmount,
      paid: p.paidAmount,
      status: p.paymentStatus,
    });
  });
  return workbook;
};

export const buildCustomersReportWorkbook = async (rows) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Customers');
  sheet.columns = [
    { header: 'Customer', key: 'name', width: 24 },
    { header: 'Phone', key: 'phone', width: 14 },
    { header: 'Village', key: 'village', width: 16 },
    { header: 'Balance', key: 'balance', width: 12 },
    { header: 'Period Sales', key: 'periodSales', width: 12 },
    { header: 'Pending', key: 'pending', width: 12 },
  ];
  sheet.getRow(1).font = { bold: true };
  rows.forEach((r) => {
    sheet.addRow({
      name: r.name,
      phone: r.phone,
      village: r.village || '',
      balance: r.currentBalance,
      periodSales: r.periodSalesAmount,
      pending: r.pendingAmount,
    });
  });
  return workbook;
};

export const buildPaymentsReportWorkbook = async (payments) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Payments');
  sheet.columns = [
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Customer', key: 'customer', width: 20 },
    { header: 'Invoice', key: 'invoice', width: 14 },
    { header: 'Amount', key: 'amount', width: 12 },
    { header: 'Method', key: 'method', width: 10 },
    { header: 'Reference', key: 'reference', width: 16 },
  ];
  sheet.getRow(1).font = { bold: true };
  payments.forEach((p) => {
    sheet.addRow({
      date: p.paymentDate,
      customer: p.customerName,
      invoice: p.invoiceNumber || '',
      amount: p.amount,
      method: p.paymentMethod,
      reference: p.referenceNumber || '',
    });
  });
  return workbook;
};
