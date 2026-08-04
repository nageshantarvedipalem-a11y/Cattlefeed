import PDFDocument from 'pdfkit';

const addTableHeader = (doc, columns, y) => {
  doc.fontSize(9).font('Helvetica-Bold');
  let x = doc.page.margins.left;
  columns.forEach((col) => {
    doc.text(col.label, x, y, { width: col.width, continued: false });
    x += col.width;
  });
  doc.moveDown(0.5);
};

export const buildStockHistoryPdf = (movements, filters = {}) => new Promise((resolve, reject) => {
  const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
  const chunks = [];

  doc.on('data', (chunk) => chunks.push(chunk));
  doc.on('end', () => resolve(Buffer.concat(chunks)));
  doc.on('error', reject);

  doc.fontSize(16).font('Helvetica-Bold').text('Cattle Feed ERP — Stock History', { align: 'center' });
  doc.moveDown(0.5);

  const filterText = [
    filters.period ? `Period: ${filters.period}` : null,
    filters.dateFrom ? `From: ${filters.dateFrom}` : null,
    filters.dateTo ? `To: ${filters.dateTo}` : null,
    filters.search ? `Search: ${filters.search}` : null,
  ].filter(Boolean).join(' | ');

  if (filterText) {
    doc.fontSize(9).font('Helvetica').text(filterText, { align: 'center' });
    doc.moveDown();
  }

  doc.fontSize(8).font('Helvetica-Bold');
  const columns = [
    { label: 'Date', width: 90 },
    { label: 'Product', width: 120 },
    { label: 'SKU', width: 70 },
    { label: 'Type', width: 40 },
    { label: 'Qty', width: 45 },
    { label: 'Balance', width: 55 },
    { label: 'Reference', width: 80 },
    { label: 'Remarks', width: 120 },
  ];

  let y = doc.y;
  addTableHeader(doc, columns, y);
  y = doc.y;

  doc.font('Helvetica').fontSize(7);

  movements.forEach((movement, index) => {
    if (y > doc.page.height - 60) {
      doc.addPage();
      y = doc.page.margins.top;
      addTableHeader(doc, columns, y);
      y = doc.y;
      doc.font('Helvetica').fontSize(7);
    }

    let x = doc.page.margins.left;
    const row = [
      new Date(movement.createdAt).toLocaleDateString('en-IN'),
      movement.productName,
      movement.productSku,
      movement.movementType.toUpperCase(),
      String(movement.quantity),
      String(movement.balanceAfter),
      `${movement.referenceType}${movement.referenceId ? ` #${movement.referenceId}` : ''}`,
      movement.remarks || '',
    ];

    row.forEach((cell, i) => {
      doc.text(String(cell).slice(0, 40), x, y, { width: columns[i].width, lineBreak: false });
      x += columns[i].width;
    });

    y += 14;

    if (index === movements.length - 1) {
      doc.y = y;
    }
  });

  doc.end();
});

export const buildLowStockPdf = (products) => new Promise((resolve, reject) => {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  const chunks = [];

  doc.on('data', (chunk) => chunks.push(chunk));
  doc.on('end', () => resolve(Buffer.concat(chunks)));
  doc.on('error', reject);

  doc.fontSize(16).font('Helvetica-Bold').text('Cattle Feed ERP — Low Stock Alert', { align: 'center' });
  doc.moveDown();

  doc.fontSize(9).font('Helvetica-Bold');
  const columns = [
    { label: 'Product', width: 160 },
    { label: 'SKU', width: 80 },
    { label: 'Current', width: 60 },
    { label: 'Minimum', width: 60 },
    { label: 'Category', width: 100 },
  ];

  let y = doc.y;
  addTableHeader(doc, columns, y);
  y = doc.y + 12;

  doc.font('Helvetica').fontSize(8);

  products.forEach((product) => {
    if (y > doc.page.height - 60) {
      doc.addPage();
      y = doc.page.margins.top;
      addTableHeader(doc, columns, y);
      y = doc.y + 12;
      doc.font('Helvetica').fontSize(8);
    }

    let x = doc.page.margins.left;
    const row = [
      product.name,
      product.sku,
      String(product.currentStock),
      String(product.minStock),
      product.categoryName || '',
    ];

    row.forEach((cell, i) => {
      doc.text(String(cell), x, y, { width: columns[i].width, lineBreak: false });
      x += columns[i].width;
    });

    y += 14;
  });

  doc.end();
});

export const buildCashBookPdf = (entries, summary = null) => new Promise((resolve, reject) => {
  const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
  const chunks = [];

  doc.on('data', (chunk) => chunks.push(chunk));
  doc.on('end', () => resolve(Buffer.concat(chunks)));
  doc.on('error', reject);

  doc.fontSize(16).font('Helvetica-Bold').text('Cattle Feed ERP — Cash Book', { align: 'center' });
  doc.moveDown(0.5);

  if (summary) {
    doc.fontSize(10).font('Helvetica');
    doc.text(`Opening: ${summary.openingBalance.toFixed(2)} | Inflow: ${summary.totalInflow.toFixed(2)} | Outflow: ${summary.totalOutflow.toFixed(2)} | Closing: ${summary.closingBalance.toFixed(2)}`);
    doc.moveDown();
  }

  const columns = [
    { label: 'Date', width: 70 },
    { label: 'Type', width: 60 },
    { label: 'Category', width: 80 },
    { label: 'Method', width: 50 },
    { label: 'Amount', width: 55 },
    { label: 'Balance', width: 55 },
    { label: 'Remarks', width: 180 },
  ];

  let y = doc.y;
  addTableHeader(doc, columns, y);
  y = doc.y + 4;
  doc.font('Helvetica').fontSize(7);

  entries.forEach((entry) => {
    if (y > doc.page.height - 60) {
      doc.addPage();
      y = doc.page.margins.top;
      addTableHeader(doc, columns, y);
      y = doc.y + 4;
      doc.font('Helvetica').fontSize(7);
    }

    let x = doc.page.margins.left;
    const row = [
      String(entry.transactionDate),
      entry.transactionType,
      entry.category || '',
      entry.paymentMethod,
      entry.amount.toFixed(2),
      entry.balanceAfter.toFixed(2),
      entry.remarks || '',
    ];

    row.forEach((cell, i) => {
      doc.text(String(cell).slice(0, 40), x, y, { width: columns[i].width, lineBreak: false });
      x += columns[i].width;
    });
    y += 14;
  });

  doc.end();
});

export const buildLedgerPdf = (entries, summary = null) => new Promise((resolve, reject) => {
  const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
  const chunks = [];

  doc.on('data', (chunk) => chunks.push(chunk));
  doc.on('end', () => resolve(Buffer.concat(chunks)));
  doc.on('error', reject);

  doc.fontSize(16).font('Helvetica-Bold').text('Cattle Feed ERP — Customer Ledger', { align: 'center' });
  doc.moveDown(0.5);

  if (summary?.customer) {
    doc.fontSize(10).font('Helvetica');
    doc.text(`Customer: ${summary.customer.name} (${summary.customer.phone || 'N/A'})`);
    doc.text(`Opening Balance: ${summary.openingBalance.toFixed(2)} | Pending: ${summary.pendingAmount.toFixed(2)}`);
    doc.moveDown();
  }

  const columns = [
    { label: 'Date', width: 90 },
    { label: 'Type', width: 60 },
    { label: 'Debit', width: 55 },
    { label: 'Credit', width: 55 },
    { label: 'Balance', width: 55 },
    { label: 'Remarks', width: 200 },
  ];

  let y = doc.y;
  addTableHeader(doc, columns, y);
  y = doc.y + 4;
  doc.font('Helvetica').fontSize(7);

  entries.forEach((entry) => {
    if (y > doc.page.height - 60) {
      doc.addPage();
      y = doc.page.margins.top;
      addTableHeader(doc, columns, y);
      y = doc.y + 4;
      doc.font('Helvetica').fontSize(7);
    }

    let x = doc.page.margins.left;
    const row = [
      new Date(entry.transactionDate).toLocaleDateString('en-IN'),
      entry.transactionType,
      entry.debit ? entry.debit.toFixed(2) : '',
      entry.credit ? entry.credit.toFixed(2) : '',
      entry.balance.toFixed(2),
      entry.remarks || '',
    ];

    row.forEach((cell, i) => {
      doc.text(String(cell).slice(0, 50), x, y, { width: columns[i].width, lineBreak: false });
      x += columns[i].width;
    });
    y += 14;
  });

  if (summary) {
    y += 10;
    doc.font('Helvetica-Bold').fontSize(9);
    doc.text(`Closing Balance: ${summary.closingBalance.toFixed(2)}`, doc.page.margins.left, y);
  }

  doc.end();
});

export const buildPendingPaymentsPdf = (pendingSales, summary = null) => new Promise((resolve, reject) => {
  const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
  const chunks = [];

  doc.on('data', (chunk) => chunks.push(chunk));
  doc.on('end', () => resolve(Buffer.concat(chunks)));
  doc.on('error', reject);

  doc.fontSize(16).font('Helvetica-Bold').text('Cattle Feed ERP — Pending Payments', { align: 'center' });
  doc.moveDown(0.5);

  if (summary) {
    doc.fontSize(10).font('Helvetica');
    doc.text(`Total Pending: ${summary.totalPending.toFixed(2)} | Overdue: ${summary.overdueAmount.toFixed(2)} | Invoices: ${summary.totalInvoices}`);
    doc.moveDown();
  }

  const columns = [
    { label: 'Invoice', width: 70 },
    { label: 'Customer', width: 100 },
    { label: 'Total', width: 55 },
    { label: 'Paid', width: 55 },
    { label: 'Pending', width: 55 },
    { label: 'Due Date', width: 70 },
    { label: 'Status', width: 50 },
  ];

  let y = doc.y;
  addTableHeader(doc, columns, y);
  y = doc.y + 4;
  doc.font('Helvetica').fontSize(7);

  pendingSales.forEach((sale) => {
    if (y > doc.page.height - 60) {
      doc.addPage();
      y = doc.page.margins.top;
      addTableHeader(doc, columns, y);
      y = doc.y + 4;
      doc.font('Helvetica').fontSize(7);
    }

    let x = doc.page.margins.left;
    const row = [
      sale.invoiceNumber,
      sale.customerName,
      sale.totalAmount.toFixed(2),
      sale.paidAmount.toFixed(2),
      sale.pendingAmount.toFixed(2),
      sale.dueDate ? String(sale.dueDate).slice(0, 10) : '',
      sale.paymentStatus,
    ];

    row.forEach((cell, i) => {
      doc.text(String(cell).slice(0, 40), x, y, { width: columns[i].width, lineBreak: false });
      x += columns[i].width;
    });
    y += 14;
  });

  doc.end();
});

export const buildProfitPdf = (entries, meta = {}) => new Promise((resolve, reject) => {
  const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
  const chunks = [];

  doc.on('data', (chunk) => chunks.push(chunk));
  doc.on('end', () => resolve(Buffer.concat(chunks)));
  doc.on('error', reject);

  doc.fontSize(16).font('Helvetica-Bold').text('Cattle Feed ERP — Profit Report', { align: 'center' });
  doc.moveDown(0.5);

  if (meta.summary) {
    doc.fontSize(10).font('Helvetica');
    doc.text(`Today: ${meta.summary.today.profit.toFixed(2)} | Month: ${meta.summary.monthly.profit.toFixed(2)} | Year: ${meta.summary.yearly.profit.toFixed(2)} | Overall: ${meta.summary.overall.profit.toFixed(2)}`);
    doc.moveDown();
  }

  if (meta.filteredTotals) {
    doc.fontSize(10).text(`Filtered Period Profit: ${meta.filteredTotals.profit.toFixed(2)} | Revenue: ${meta.filteredTotals.revenue.toFixed(2)} | Cost: ${meta.filteredTotals.cost.toFixed(2)}`);
    doc.moveDown();
  }

  const columns = [
    { label: 'Date', width: 70 },
    { label: 'Invoice', width: 60 },
    { label: 'Product', width: 120 },
    { label: 'Qty', width: 35 },
    { label: 'Cost', width: 50 },
    { label: 'Revenue', width: 55 },
    { label: 'Profit', width: 55 },
  ];

  let y = doc.y;
  addTableHeader(doc, columns, y);
  y = doc.y + 4;
  doc.font('Helvetica').fontSize(7);

  entries.forEach((entry) => {
    if (y > doc.page.height - 60) {
      doc.addPage();
      y = doc.page.margins.top;
      addTableHeader(doc, columns, y);
      y = doc.y + 4;
      doc.font('Helvetica').fontSize(7);
    }

    let x = doc.page.margins.left;
    const row = [
      String(entry.saleDate).slice(0, 10),
      entry.invoiceNumber,
      entry.productName,
      String(entry.quantity),
      entry.costAmount.toFixed(2),
      entry.totalAmount.toFixed(2),
      entry.profitAmount.toFixed(2),
    ];

    row.forEach((cell, i) => {
      doc.text(String(cell).slice(0, 40), x, y, { width: columns[i].width, lineBreak: false });
      x += columns[i].width;
    });
    y += 14;
  });

  doc.end();
});
