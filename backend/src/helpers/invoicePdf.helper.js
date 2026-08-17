import PDFDocument from 'pdfkit';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { formatCurrencyForPdf } from '../utils/formatCurrency.helper.js';
import { logger } from '../utils/logger.js';
import { buildInvoiceHtml } from './invoiceHtml.helper.js';
import { launchBrowser } from './puppeteerBrowser.helper.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const logoPath = join(__dirname, '../assets/logo.png');

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

const buildPaymentAllocationLines = (sale, currency) => {
  const lines = [];
  if (Number(sale.previousPendingBalance) > 0) {
    lines.push(['Previous Pending', formatCurrencyForPdf(sale.previousPendingBalance, currency)]);
  }
  if (Number(sale.amountReceived) > 0) {
    lines.push(['Amount Received', formatCurrencyForPdf(sale.amountReceived, currency)]);
  }
  if (Number(sale.oldBalancePaid) > 0) {
    lines.push(['Paid to Old Balance', formatCurrencyForPdf(sale.oldBalancePaid, currency)]);
  }
  if (sale.totalPendingAfter !== null && sale.totalPendingAfter !== undefined) {
    lines.push(['Total Pending Now', formatCurrencyForPdf(sale.totalPendingAfter, currency)]);
  }
  return lines;
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
      formatCurrencyForPdf(item.sellingPrice, currency),
      String(item.quantity),
      formatCurrencyForPdf(item.totalAmount, currency),
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

  addTotalRow('Subtotal', formatCurrencyForPdf(sale.subtotal, currency));
  if (Number(sale.discountAmount) > 0) {
    addTotalRow('Discount', `-${formatCurrencyForPdf(sale.discountAmount, currency)}`);
  }
  addTotalRow('GST', formatCurrencyForPdf(sale.taxAmount, currency));
  addTotalRow('Grand Total', formatCurrencyForPdf(sale.totalAmount, currency), true);
  addTotalRow('Paid on This Bill', formatCurrencyForPdf(sale.paidAmount, currency));
  addTotalRow('This Bill Pending', formatCurrencyForPdf(sale.pendingAmount, currency));
  buildPaymentAllocationLines(sale, currency).forEach(([label, value]) => addTotalRow(label, value));
  addTotalRow('Payment', (sale.primaryPaymentMethod || 'cash').toUpperCase());
  addTotalRow('Status', paymentStatusLabel(sale));

  doc.moveDown(2);
  doc.fontSize(9).font('Helvetica').text('Thank you for your business!', { align: 'center' });
  doc.end();
});

const COLORS = {
  orange: '#F5A623',
  sheet: '#eef2e6',
  darkGreen: '#3d5a2c',
  midGreen: '#8fae5f',
  rowGreen: '#e4ead6',
  text: '#4a4a3f',
};

const formatInvoiceDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });

const buildBrandedInvoicePdfKit = (sale, company) => new Promise((resolve, reject) => {
  const doc = new PDFDocument({ margin: 0, size: 'A4' });
  const chunks = [];
  const currency = company.currency_symbol || '₹';
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const contentX = 28;
  const contentWidth = pageWidth - 56;

  doc.on('data', (chunk) => chunks.push(chunk));
  doc.on('end', () => resolve(Buffer.concat(chunks)));
  doc.on('error', reject);

  doc.rect(0, 0, pageWidth, pageHeight).fill(COLORS.orange);
  doc.rect(18, 18, pageWidth - 36, pageHeight - 36).fill(COLORS.sheet);
  doc.rect(18, 18, contentWidth + 4, 88).fill(COLORS.darkGreen);
  doc.rect(18, 18, contentWidth + 4, 48).fill(COLORS.midGreen);
  doc.rect(18, pageHeight - 58, contentWidth + 4, 40).fill(COLORS.midGreen);
  doc.rect(18, pageHeight - 38, contentWidth + 4, 20).fill(COLORS.darkGreen);

  doc.fillColor(COLORS.darkGreen).font('Helvetica-Bold').fontSize(34)
    .text('INVOICE', contentX, 108, { width: 240 });
  doc.font('Helvetica-Bold').fontSize(11)
    .text(`DATE: ${formatInvoiceDate(sale.saleDate)}`, contentX, 152)
    .text(`INVOICE # ${sale.invoiceNumber}`, contentX, 168);

  const logoX = pageWidth - contentX - 96;
  try {
    doc.image(logoPath, logoX, 98, { width: 72, height: 72 });
  } catch {
    /* logo optional */
  }
  doc.font('Helvetica-Bold').fontSize(14).fillColor(COLORS.midGreen)
    .text(company.company_name || 'Cattle Feed ERP', logoX - 20, 176, { width: 116, align: 'right' });
  doc.font('Helvetica-Bold').fontSize(8).fillColor(COLORS.darkGreen)
    .text('CATTLE FEED SUPPLY', logoX - 20, 194, { width: 116, align: 'right' });

  const partyTop = 220;
  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.darkGreen)
    .text('BILL TO:', contentX, partyTop);
  doc.font('Helvetica-Bold').fontSize(13)
    .text((sale.customerName || 'Walk-in Customer').toUpperCase(), contentX, partyTop + 16, { width: 240 });
  doc.font('Helvetica').fontSize(10).fillColor(COLORS.text)
    .text(`PHONE: ${sale.customerPhone || '—'}`, contentX, partyTop + 38)
    .text(`ADDRESS: ${[sale.customerAddress, sale.customerVillage].filter(Boolean).join(', ') || '—'}`, contentX, partyTop + 54, { width: 240 });

  const companyX = pageWidth / 2 + 10;
  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.darkGreen)
    .text('COMPANY ADDRESS', companyX, partyTop);
  doc.font('Helvetica').fontSize(10).fillColor(COLORS.text)
    .text(`ADDRESS: ${company.company_address || '—'}`, companyX, partyTop + 20, { width: 230 })
    .text(`PHONE: ${company.company_phone || '—'}`, companyX, partyTop + 50)
    .text(`GSTIN: ${company.company_gst || '—'}`, companyX, partyTop + 66);

  const tableTop = 310;
  const colWidths = [34, contentWidth - 234, 66, 54, 80];
  const headers = ['', 'Item Description', 'Price', 'Qty.', 'Total'];
  let x = contentX;

  doc.rect(contentX, tableTop, contentWidth, 24).fill(COLORS.midGreen);
  doc.fillColor(COLORS.darkGreen).font('Helvetica-Bold').fontSize(10);
  headers.forEach((header, i) => {
    doc.text(header, x + 4, tableTop + 7, { width: colWidths[i] - 8, align: i >= 2 ? 'right' : 'left' });
    x += colWidths[i];
  });

  let rowY = tableTop + 24;
  doc.font('Helvetica').fontSize(9).fillColor(COLORS.text);
  (sale.items || []).forEach((item, index) => {
    const rowHeight = 22;
    doc.rect(contentX, rowY, contentWidth, rowHeight).fill(COLORS.rowGreen);
    x = contentX;
    const cells = [
      String(index + 1),
      item.productName,
      formatCurrencyForPdf(item.sellingPrice, currency),
      String(item.quantity),
      formatCurrencyForPdf(item.totalAmount, currency),
    ];
    cells.forEach((cell, i) => {
      doc.fillColor(COLORS.text).text(cell, x + 4, rowY + 6, {
        width: colWidths[i] - 8,
        align: i >= 2 ? 'right' : 'left',
      });
      x += colWidths[i];
    });
    rowY += rowHeight + 3;
  });

  const totalsWidth = 250;
  const totalsX = contentX + contentWidth - totalsWidth;
  const totalsTop = rowY + 8;
  doc.rect(totalsX, totalsTop, totalsWidth, Number(sale.discountAmount) > 0 ? 92 : 76).fill(COLORS.midGreen);

  const addTotalRow = (label, value, y, bold = false) => {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 12 : 10)
      .fillColor(COLORS.darkGreen)
      .text(label, totalsX + 14, y, { width: 120 })
      .text(value, totalsX + totalsWidth - 94, y, { width: 80, align: 'right' });
  };

  let totalY = totalsTop + 12;
  addTotalRow('SUBTOTAL', formatCurrencyForPdf(sale.subtotal, currency), totalY);
  totalY += 18;
  if (Number(sale.discountAmount) > 0) {
    addTotalRow('DISCOUNT', `-${formatCurrencyForPdf(sale.discountAmount, currency)}`, totalY);
    totalY += 18;
  }
  addTotalRow('GST', formatCurrencyForPdf(sale.taxAmount, currency), totalY);
  totalY += 20;
  addTotalRow('TOTAL', formatCurrencyForPdf(sale.totalAmount, currency), totalY, true);

  const payTop = totalsTop + 110;
  doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.darkGreen)
    .text('PAYMENT INFO', contentX, payTop);
  let payLineY = payTop + 18;
  const addPayLine = (label, value) => {
    doc.font('Helvetica').fontSize(10).fillColor(COLORS.text)
      .text(`${label}: ${value}`, contentX, payLineY);
    payLineY += 16;
  };
  addPayLine('Payment Type', (sale.primaryPaymentMethod || 'cash').toUpperCase());
  addPayLine('Paid on This Bill', formatCurrencyForPdf(sale.paidAmount, currency));
  addPayLine('This Bill Pending', formatCurrencyForPdf(sale.pendingAmount, currency));
  buildPaymentAllocationLines(sale, currency).forEach(([label, value]) => addPayLine(label, value));
  addPayLine('Status', paymentStatusLabel(sale));

  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.darkGreen)
    .text('Terms and Conditions', companyX, payTop);
  doc.font('Helvetica').fontSize(8).fillColor(COLORS.text)
    .text(
      'Goods once sold will not be taken back. Payment due as per agreed terms. Please check quantity and quality at the time of delivery.',
      companyX,
      payTop + 18,
      { width: 230 }
    );

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
    logger.warn(`HTML invoice PDF unavailable, using branded PDFKit: ${error.message}`);
    return buildBrandedInvoicePdfKit(sale, company);
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
      `${item.quantity} x ${formatCurrencyForPdf(item.sellingPrice, currency)} = ${formatCurrencyForPdf(item.totalAmount, currency)}`,
      { width }
    );
  });

  doc.text('--------------------------------', { align: 'center', width });
  doc.text(`Subtotal: ${formatCurrencyForPdf(sale.subtotal, currency)}`, { align: 'right', width });
  doc.text(`Discount: ${formatCurrencyForPdf(sale.discountAmount, currency)}`, { align: 'right', width });
  doc.text(`GST: ${formatCurrencyForPdf(sale.taxAmount, currency)}`, { align: 'right', width });
  doc.font('Helvetica-Bold').text(`Grand Total: ${formatCurrencyForPdf(sale.totalAmount, currency)}`, { align: 'right', width });
  doc.font('Helvetica');
  doc.text(`Paid on This Bill: ${formatCurrencyForPdf(sale.paidAmount, currency)}`, { align: 'right', width });
  doc.text(`This Bill Pending: ${formatCurrencyForPdf(sale.pendingAmount, currency)}`, { align: 'right', width });
  buildPaymentAllocationLines(sale, currency).forEach(([label, value]) => {
    doc.text(`${label}: ${value}`, { align: 'right', width });
  });
  doc.text(`Payment: ${sale.primaryPaymentMethod?.toUpperCase() || 'CASH'}`, { align: 'right', width });
  doc.text(`Status: ${paymentStatusLabel(sale)}`, { align: 'right', width });
  doc.moveDown(0.5);
  doc.fontSize(8).text('Thank you for your business!', { align: 'center', width });

  doc.end();
});
