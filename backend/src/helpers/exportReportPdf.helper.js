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

const renderTable = (doc, columns, rows, rowMapper) => {
  let y = doc.y;
  addTableHeader(doc, columns, y);
  y = doc.y + 4;
  doc.font('Helvetica').fontSize(7);

  rows.forEach((row) => {
    if (y > doc.page.height - 60) {
      doc.addPage();
      y = doc.page.margins.top;
      addTableHeader(doc, columns, y);
      y = doc.y + 4;
      doc.font('Helvetica').fontSize(7);
    }

    let x = doc.page.margins.left;
    const cells = rowMapper(row);
    cells.forEach((cell, i) => {
      doc.text(String(cell ?? '').slice(0, 40), x, y, { width: columns[i].width, lineBreak: false });
      x += columns[i].width;
    });
    y += 14;
  });
};

export const buildSummaryReportPdf = (summary) => new Promise((resolve, reject) => {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));
  doc.on('end', () => resolve(Buffer.concat(chunks)));
  doc.on('error', reject);

  doc.fontSize(16).font('Helvetica-Bold').text('Cattle Feed ERP — Business Summary', { align: 'center' });
  doc.moveDown();
  doc.fontSize(10).font('Helvetica');
  doc.text(`Period: ${summary.period}`);
  doc.moveDown();

  const lines = [
    ['Sales', `${summary.sales.count} invoices`, summary.sales.total.toFixed(2)],
    ['Purchases', `${summary.purchases.count} records`, summary.purchases.total.toFixed(2)],
    ['Profit', '—', summary.profit.amount.toFixed(2)],
    ['Payments Received', `${summary.payments.count} records`, summary.payments.total.toFixed(2)],
    ['Cash Inflow', '—', summary.cashBook.inflow.toFixed(2)],
    ['Cash Outflow', '—', summary.cashBook.outflow.toFixed(2)],
    ['Outstanding', `${summary.outstanding.pendingInvoices} invoices`, summary.outstanding.pendingAmount.toFixed(2)],
    ['Active Customers', String(summary.customers.active), '—'],
    ['Low Stock Products', String(summary.stock.lowStockProducts), '—'],
  ];

  lines.forEach(([label, count, amount]) => {
    doc.text(`${label}: ${count}${amount !== '—' ? ` | Amount: ${amount}` : ''}`);
  });

  doc.end();
});

export const buildSalesReportPdf = (sales) => new Promise((resolve, reject) => {
  const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));
  doc.on('end', () => resolve(Buffer.concat(chunks)));
  doc.on('error', reject);

  doc.fontSize(16).font('Helvetica-Bold').text('Cattle Feed ERP — Sales Report', { align: 'center' });
  doc.moveDown();

  renderTable(doc,
    [
      { label: 'Invoice', width: 70 },
      { label: 'Customer', width: 100 },
      { label: 'Date', width: 70 },
      { label: 'Total', width: 55 },
      { label: 'Paid', width: 55 },
      { label: 'Pending', width: 55 },
      { label: 'Status', width: 50 },
    ],
    sales,
    (s) => [s.invoiceNumber, s.customerName || 'Walk-in', String(s.saleDate).slice(0, 10), s.totalAmount.toFixed(2), s.paidAmount.toFixed(2), s.pendingAmount.toFixed(2), s.paymentStatus]
  );

  doc.end();
});

export const buildPurchasesReportPdf = (purchases) => new Promise((resolve, reject) => {
  const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));
  doc.on('end', () => resolve(Buffer.concat(chunks)));
  doc.on('error', reject);

  doc.fontSize(16).font('Helvetica-Bold').text('Cattle Feed ERP — Purchase Report', { align: 'center' });
  doc.moveDown();

  renderTable(doc,
    [
      { label: 'Invoice', width: 70 },
      { label: 'Supplier', width: 120 },
      { label: 'Date', width: 70 },
      { label: 'Total', width: 55 },
      { label: 'Paid', width: 55 },
      { label: 'Status', width: 50 },
    ],
    purchases,
    (p) => [p.invoiceNumber, p.supplierName, String(p.purchaseDate).slice(0, 10), p.totalAmount.toFixed(2), p.paidAmount.toFixed(2), p.paymentStatus]
  );

  doc.end();
});

export const buildCustomersReportPdf = (rows) => new Promise((resolve, reject) => {
  const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));
  doc.on('end', () => resolve(Buffer.concat(chunks)));
  doc.on('error', reject);

  doc.fontSize(16).font('Helvetica-Bold').text('Cattle Feed ERP — Customer Report', { align: 'center' });
  doc.moveDown();

  renderTable(doc,
    [
      { label: 'Customer', width: 100 },
      { label: 'Phone', width: 70 },
      { label: 'Village', width: 80 },
      { label: 'Balance', width: 55 },
      { label: 'Period Sales', width: 55 },
      { label: 'Pending', width: 55 },
    ],
    rows,
    (r) => [r.name, r.phone, r.village || '', r.currentBalance.toFixed(2), r.periodSalesAmount.toFixed(2), r.pendingAmount.toFixed(2)]
  );

  doc.end();
});

export const buildPaymentsReportPdf = (payments) => new Promise((resolve, reject) => {
  const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });
  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));
  doc.on('end', () => resolve(Buffer.concat(chunks)));
  doc.on('error', reject);

  doc.fontSize(16).font('Helvetica-Bold').text('Cattle Feed ERP — Payment Report', { align: 'center' });
  doc.moveDown();

  renderTable(doc,
    [
      { label: 'Date', width: 70 },
      { label: 'Customer', width: 100 },
      { label: 'Invoice', width: 70 },
      { label: 'Amount', width: 55 },
      { label: 'Method', width: 50 },
    ],
    payments,
    (p) => [p.paymentDate, p.customerName, p.invoiceNumber || '', p.amount.toFixed(2), p.paymentMethod]
  );

  doc.end();
});
