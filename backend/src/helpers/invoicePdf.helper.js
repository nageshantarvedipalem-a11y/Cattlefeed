import PDFDocument from 'pdfkit';
import { formatCurrency } from '../utils/formatCurrency.helper.js';
import { logger } from '../utils/logger.js';
import { buildInvoiceHtml } from './invoiceHtml.helper.js';
import { launchBrowser } from './puppeteerBrowser.helper.js';

let browserPromise = null;

const getBrowser = async () => {
  if (!browserPromise) {
    browserPromise = launchBrowser().catch((error) => {
      browserPromise = null;
      throw error;
    });
  }
  return browserPromise;
};

const paymentStatusLabel = (sale) => {
  if (sale.paymentStatus === 'paid') return 'PAID';
  if (sale.paymentStatus === 'partial') return 'PARTIALLY PAID';
  if (Number(sale.paidAmount) === 0) return 'CREDIT';
  return String(sale.paymentStatus || '').toUpperCase();
};

const buildStandardInvoicePdfKit = (sale, company) => new Promise((resolve, reject) => {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const chunks = [];
  const currency = company.currency_symbol || '₹';
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  doc.on('data', (chunk) => chunks.push(chunk));
  doc.on('end', () => resolve(Buffer.concat(chunks)));
  doc.on('error', reject);

  doc.fontSize(22).font('Helvetica-Bold').text('TAX INVOICE', { align: 'right' });
  doc.fontSize(10).font('Helvetica').text(company.company_name || 'Cattle Feed ERP', { align: 'right' });
  if (company.company_address) doc.text(company.company_address, { align: 'right' });
  if (company.company_phone) doc.text(`Phone: ${company.company_phone}`, { align: 'right' });
  if (company.company_gst) doc.text(`GST: ${company.company_gst}`, { align: 'right' });

  doc.moveDown(1);
  doc.fontSize(10).font('Helvetica-Bold');
  doc.text(`Invoice No: ${sale.invoiceNumber}`);
  doc.font('Helvetica').text(`Date: ${new Date(sale.saleDate).toLocaleDateString('en-IN')}`);
  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').text('Bill To:');
  doc.font('Helvetica').text(sale.customerName || 'Walk-in Customer');
  if (sale.customerPhone) doc.text(`Phone: ${sale.customerPhone}`);

  const tableTop = doc.y + 12;
  const colWidths = [30, pageWidth - 210, 60, 50, 70];
  const headers = ['#', 'Product', 'Rate', 'Qty', 'Amount'];
  let x = doc.page.margins.left;

  doc.font('Helvetica-Bold').fontSize(9);
  headers.forEach((header, i) => {
    doc.text(header, x, tableTop, { width: colWidths[i], align: i >= 2 ? 'right' : 'left' });
    x += colWidths[i];
  });

  doc.moveTo(doc.page.margins.left, tableTop + 14)
    .lineTo(doc.page.width - doc.page.margins.right, tableTop + 14)
    .stroke();

  let rowY = tableTop + 20;
  doc.font('Helvetica').fontSize(9);
  (sale.items || []).forEach((item, index) => {
    x = doc.page.margins.left;
    const cells = [
      String(index + 1),
      item.productName,
      formatCurrency(item.sellingPrice, currency),
      String(item.quantity),
      formatCurrency(item.totalAmount, currency),
    ];
    cells.forEach((cell, i) => {
      doc.text(cell, x, rowY, { width: colWidths[i], align: i >= 2 ? 'right' : 'left' });
      x += colWidths[i];
    });
    rowY += 18;
  });

  doc.y = rowY + 10;
  const totalsX = doc.page.width - doc.page.margins.right - 180;
  const addTotalRow = (label, value, bold = false) => {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(10);
    doc.text(label, totalsX, doc.y, { width: 90, continued: false });
    doc.text(value, totalsX + 90, doc.y - 12, { width: 90, align: 'right' });
    doc.moveDown(0.3);
  };

  addTotalRow('Subtotal', formatCurrency(sale.subtotal, currency));
  if (Number(sale.discountAmount) > 0) {
    addTotalRow('Discount', `-${formatCurrency(sale.discountAmount, currency)}`);
  }
  addTotalRow('GST', formatCurrency(sale.taxAmount, currency));
  addTotalRow('Grand Total', formatCurrency(sale.totalAmount, currency), true);
  addTotalRow('Paid', formatCurrency(sale.paidAmount, currency));
  addTotalRow('Pending', formatCurrency(sale.pendingAmount, currency));
  addTotalRow('Payment', (sale.primaryPaymentMethod || 'cash').toUpperCase());
  addTotalRow('Status', paymentStatusLabel(sale));

  doc.moveDown(2);
  doc.fontSize(9).font('Helvetica').text('Thank you for your business!', { align: 'center' });
  doc.end();
});

const buildInvoicePdfWithPuppeteer = async (sale, company) => {
  const html = buildInvoiceHtml(sale, company);
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setContent(html, { waitUntil: 'load', timeout: 30000 });
    await page.emulateMediaType('print');
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await page.close();
  }
};

export const buildInvoicePdf = async (sale, company) => {
  try {
    return await buildInvoicePdfWithPuppeteer(sale, company);
  } catch (error) {
    browserPromise = null;
    logger.error(`Styled invoice PDF generation failed: ${error.message}`);
    throw new Error(
      `Could not generate styled invoice PDF. ${error.message}`
    );
  }
};

export const buildThermalInvoicePdf = (sale, company) => new Promise((resolve, reject) => {
  const doc = new PDFDocument({ margin: 12, size: [226.77, 841.89] });
  const chunks = [];
  const currency = company.currency_symbol || '₹';
  const width = 202;

  doc.on('data', (chunk) => chunks.push(chunk));
  doc.on('end', () => resolve(Buffer.concat(chunks)));
  doc.on('error', reject);

  doc.fontSize(11).font('Helvetica-Bold').text(company.company_name || 'Cattle Feed ERP', { align: 'center', width });
  doc.fontSize(8).font('Helvetica');
  if (company.company_address) doc.text(company.company_address, { align: 'center', width });
  if (company.company_phone) doc.text(`Ph: ${company.company_phone}`, { align: 'center', width });
  if (company.company_gst) doc.text(`GST: ${company.company_gst}`, { align: 'center', width });

  doc.moveDown(0.5);
  doc.fontSize(9).font('Helvetica-Bold').text('TAX INVOICE', { align: 'center', width });
  doc.fontSize(8).font('Helvetica');
  doc.text(`Invoice: ${sale.invoiceNumber}`);
  doc.text(`Date: ${new Date(sale.saleDate).toLocaleString('en-IN')}`);
  doc.text(`Customer: ${sale.customerName || 'Walk-in'}`);
  if (sale.customerPhone) doc.text(`Phone: ${sale.customerPhone}`);
  doc.moveDown(0.5);
  doc.text('--------------------------------', { align: 'center', width });

  sale.items.forEach((item) => {
    doc.font('Helvetica-Bold').text(item.productName, { width });
    doc.font('Helvetica').text(
      `${item.quantity} x ${formatCurrency(item.sellingPrice, currency)} = ${formatCurrency(item.totalAmount, currency)}`,
      { width }
    );
  });

  doc.text('--------------------------------', { align: 'center', width });
  doc.text(`Subtotal: ${formatCurrency(sale.subtotal, currency)}`, { align: 'right', width });
  doc.text(`Discount: ${formatCurrency(sale.discountAmount, currency)}`, { align: 'right', width });
  doc.text(`GST: ${formatCurrency(sale.taxAmount, currency)}`, { align: 'right', width });
  doc.font('Helvetica-Bold').text(`Grand Total: ${formatCurrency(sale.totalAmount, currency)}`, { align: 'right', width });
  doc.font('Helvetica');
  doc.text(`Paid: ${formatCurrency(sale.paidAmount, currency)}`, { align: 'right', width });
  doc.text(`Pending: ${formatCurrency(sale.pendingAmount, currency)}`, { align: 'right', width });
  doc.text(`Payment: ${sale.primaryPaymentMethod?.toUpperCase() || 'CASH'}`, { align: 'right', width });
  doc.text(`Status: ${paymentStatusLabel(sale)}`, { align: 'right', width });
  doc.moveDown(0.5);
  doc.fontSize(8).text('Thank you for your business!', { align: 'center', width });

  doc.end();
});
