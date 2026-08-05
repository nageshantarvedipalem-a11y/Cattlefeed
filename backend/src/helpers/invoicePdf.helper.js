import PDFDocument from 'pdfkit';
import { formatCurrency } from '../utils/formatCurrency.helper.js';
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

export const buildInvoicePdf = async (sale, company) => {
  const html = buildInvoiceHtml(sale, company);
  let browser;

  try {
    browser = await getBrowser();
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
  } catch (error) {
    browserPromise = null;
    const hint = error.message?.includes('Could not find Chrome')
      ? ' Install Chrome or run: cd backend && npm run install:chrome'
      : '';
    throw new Error(`Invoice PDF generation failed: ${error.message}${hint}`);
  }
};

const paymentStatusLabel = (sale) => {
  if (sale.paymentStatus === 'paid') return 'PAID';
  if (sale.paymentStatus === 'partial') return 'PARTIALLY PAID';
  if (Number(sale.paidAmount) === 0) return 'CREDIT';
  return String(sale.paymentStatus || '').toUpperCase();
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
