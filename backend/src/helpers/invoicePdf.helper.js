import PDFDocument from 'pdfkit';
import { formatCurrency } from '../utils/formatCurrency.helper.js';

export const buildInvoicePdf = (sale, company) => new Promise((resolve, reject) => {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  const chunks = [];

  doc.on('data', (chunk) => chunks.push(chunk));
  doc.on('end', () => resolve(Buffer.concat(chunks)));
  doc.on('error', reject);

  const currency = company.currency_symbol || '₹';

  doc.fontSize(18).font('Helvetica-Bold').text(company.company_name || 'Cattle Feed ERP', { align: 'center' });
  if (company.company_address) {
    doc.fontSize(9).font('Helvetica').text(company.company_address, { align: 'center' });
  }
  if (company.company_phone || company.company_gst) {
    doc.fontSize(9).text(
      [company.company_phone && `Phone: ${company.company_phone}`, company.company_gst && `GST: ${company.company_gst}`]
        .filter(Boolean).join(' | '),
      { align: 'center' }
    );
  }

  doc.moveDown();
  doc.fontSize(14).font('Helvetica-Bold').text('TAX INVOICE', { align: 'center' });
  doc.moveDown();

  doc.fontSize(10).font('Helvetica');
  doc.text(`Invoice No: ${sale.invoiceNumber}`);
  doc.text(`Date: ${new Date(sale.saleDate).toLocaleString('en-IN')}`);
  if (sale.customerName) {
    doc.text(`Customer: ${sale.customerName}${sale.customerPhone ? ` (${sale.customerPhone})` : ''}`);
  } else {
    doc.text('Customer: Walk-in');
  }
  doc.moveDown();

  const tableTop = doc.y;
  const colX = [40, 220, 280, 330, 380, 440, 500];
  const headers = ['Item', 'Qty', 'Rate', 'GST%', 'Tax', 'Total'];

  doc.font('Helvetica-Bold').fontSize(9);
  headers.forEach((header, i) => {
    doc.text(header, colX[i], tableTop, { width: i === 0 ? 170 : 55, lineBreak: false });
  });

  let y = tableTop + 16;
  doc.font('Helvetica').fontSize(8);

  sale.items.forEach((item) => {
    if (y > 700) {
      doc.addPage();
      y = 40;
    }
    doc.text(item.productName, colX[0], y, { width: 170, lineBreak: false });
    doc.text(String(item.quantity), colX[1], y, { width: 50, lineBreak: false });
    doc.text(formatCurrency(item.sellingPrice, currency), colX[2], y, { width: 45, lineBreak: false });
    doc.text(String(item.gstRate), colX[3], y, { width: 40, lineBreak: false });
    doc.text(formatCurrency(item.taxAmount, currency), colX[4], y, { width: 50, lineBreak: false });
    doc.text(formatCurrency(item.totalAmount, currency), colX[5], y, { width: 55, lineBreak: false });
    y += 14;
  });

  doc.moveDown(2);
  y = Math.max(y + 10, doc.y);
  doc.font('Helvetica-Bold').fontSize(10);
  doc.text(`Subtotal: ${formatCurrency(sale.subtotal, currency)}`, 350, y, { align: 'right' });
  doc.text(`Tax: ${formatCurrency(sale.taxAmount, currency)}`, 350, y + 14, { align: 'right' });
  if (sale.discountAmount > 0) {
    doc.text(`Discount: -${formatCurrency(sale.discountAmount, currency)}`, 350, y + 28, { align: 'right' });
    y += 14;
  }
  doc.fontSize(12).text(`Grand Total: ${formatCurrency(sale.totalAmount, currency)}`, 350, y + 28, { align: 'right' });
  doc.fontSize(10).font('Helvetica');
  doc.text(`Paid: ${formatCurrency(sale.paidAmount, currency)}`, 350, y + 44, { align: 'right' });
  if (sale.pendingAmount > 0) {
    doc.text(`Pending: ${formatCurrency(sale.pendingAmount, currency)}`, 350, y + 58, { align: 'right' });
  }

  doc.moveDown(3);
  doc.fontSize(8).text('Thank you for your business!', { align: 'center' });

  doc.end();
});
