import PDFDocument from 'pdfkit';
import { formatCurrencyForPdf } from '../utils/formatCurrency.helper.js';

export const buildPaymentReceiptPdf = (payment, sale, company) => new Promise((resolve, reject) => {
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
  if (company.company_phone) {
    doc.fontSize(9).text(`Phone: ${company.company_phone}`, { align: 'center' });
  }

  doc.moveDown();
  doc.fontSize(14).font('Helvetica-Bold').text('PAYMENT RECEIPT', { align: 'center' });
  doc.moveDown();

  doc.fontSize(10).font('Helvetica');
  doc.text(`Receipt No: PAY-${String(payment.id).padStart(5, '0')}`);
  doc.text(`Payment Date: ${payment.paymentDate}`);
  doc.text(`Customer: ${payment.customerName}${payment.customerPhone ? ` (${payment.customerPhone})` : ''}`);
  if (payment.invoiceNumber) {
    doc.text(`Invoice: ${payment.invoiceNumber}`);
  }
  doc.moveDown();

  doc.font('Helvetica-Bold').fontSize(11);
  doc.text(`Amount Received: ${formatCurrencyForPdf(payment.amount, currency)}`);
  doc.font('Helvetica').fontSize(10);
  doc.text(`Payment Method: ${payment.paymentMethod.toUpperCase()}`);
  if (payment.referenceNumber) {
    doc.text(`Reference: ${payment.referenceNumber}`);
  }
  if (payment.remarks) {
    doc.text(`Remarks: ${payment.remarks}`);
  }

  if (sale) {
    doc.moveDown();
    doc.font('Helvetica-Bold').text('Invoice Summary');
    doc.font('Helvetica');
    doc.text(`Invoice Total: ${formatCurrencyForPdf(sale.totalAmount, currency)}`);
    doc.text(`Total Paid: ${formatCurrencyForPdf(sale.paidAmount, currency)}`);
    doc.text(`Remaining Pending: ${formatCurrencyForPdf(sale.pendingAmount, currency)}`);
  }

  doc.moveDown(2);
  doc.fontSize(9).text('Thank you for your payment.', { align: 'center' });

  doc.end();
});
