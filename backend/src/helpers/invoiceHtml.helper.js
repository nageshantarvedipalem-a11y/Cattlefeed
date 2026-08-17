import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
const formatInvoiceMoney = (amount, currency) => {
  const value = Number(amount) || 0;
  return `${currency}${new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`;
};

const __dirname = dirname(fileURLToPath(import.meta.url));
const templatePath = join(__dirname, '../templates/invoice.template.html');
const logoPath = join(__dirname, '../assets/logo.png');

const getCompanyLogoDataUri = () => {
  try {
    const logoBuffer = readFileSync(logoPath);
    return `data:image/png;base64,${logoBuffer.toString('base64')}`;
  } catch {
    return '';
  }
};

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const formatInvoiceDate = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const paymentStatusLabel = (sale) => {
  if (sale.paymentStatus === 'paid') return 'PAID';
  if (sale.paymentStatus === 'partial') return 'PARTIALLY PAID';
  if (Number(sale.paidAmount) === 0) return 'CREDIT';
  return String(sale.paymentStatus || '').toUpperCase();
};

const buildCustomerAddress = (sale) => {
  const parts = [sale.customerAddress, sale.customerVillage].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : '—';
};

const buildItemRows = (items, currency) => items.map((item, index) => `
  <tr>
    <td class="idx">${index + 1}</td>
    <td>${escapeHtml(item.productName)}</td>
    <td class="num">${formatInvoiceMoney(item.sellingPrice, currency)}</td>
    <td class="num">${escapeHtml(item.quantity)}</td>
    <td class="num">${formatInvoiceMoney(item.totalAmount, currency)}</td>
  </tr>`).join('');

const buildPaymentAllocationRows = (sale, currency) => {
  const rows = [];
  if (Number(sale.previousPendingBalance) > 0) {
    rows.push(`<div class="kv"><span class="k">Previous Pending:</span><span class="v">${formatInvoiceMoney(sale.previousPendingBalance, currency)}</span></div>`);
  }
  if (Number(sale.amountReceived) > 0) {
    rows.push(`<div class="kv"><span class="k">Amount Received:</span><span class="v">${formatInvoiceMoney(sale.amountReceived, currency)}</span></div>`);
  }
  if (Number(sale.oldBalancePaid) > 0) {
    rows.push(`<div class="kv"><span class="k">Paid to Old Balance:</span><span class="v">${formatInvoiceMoney(sale.oldBalancePaid, currency)}</span></div>`);
  }
  if (sale.totalPendingAfter !== null && sale.totalPendingAfter !== undefined) {
    rows.push(`<div class="kv"><span class="k">Total Pending Now:</span><span class="v">${formatInvoiceMoney(sale.totalPendingAfter, currency)}</span></div>`);
  }
  return rows.join('');
};

export const buildInvoiceHtml = (sale, company) => {
  const currency = company.currency_symbol || '₹';
  const template = readFileSync(templatePath, 'utf8');

  const avgGstRate = sale.items?.length
    ? sale.items.reduce((sum, item) => sum + Number(item.gstRate || 0), 0) / sale.items.length
    : 0;
  const gstLabel = avgGstRate > 0 ? `GST (${avgGstRate.toFixed(0)}%)` : 'GST';

  const discountRow = Number(sale.discountAmount) > 0
    ? `<div class="row"><span>DISCOUNT</span><span>-${formatInvoiceMoney(sale.discountAmount, currency)}</span></div>`
    : '';

  const replacements = {
    INVOICE_DATE: formatInvoiceDate(sale.saleDate),
    INVOICE_NUMBER: escapeHtml(sale.invoiceNumber),
    COMPANY_NAME: escapeHtml(company.company_name || 'Cattle Feed ERP'),
    COMPANY_TAGLINE: 'CATTLE FEED SUPPLY',
    COMPANY_LOGO: getCompanyLogoDataUri(),
    CUSTOMER_NAME: escapeHtml(sale.customerName || 'Walk-in Customer'),
    CUSTOMER_PHONE: escapeHtml(sale.customerPhone || '—'),
    CUSTOMER_ADDRESS: escapeHtml(buildCustomerAddress(sale)),
    COMPANY_ADDRESS: escapeHtml(company.company_address || '—'),
    COMPANY_PHONE: escapeHtml(company.company_phone || '—'),
    COMPANY_GST: escapeHtml(company.company_gst || '—'),
    ITEM_ROWS: buildItemRows(sale.items || [], currency),
    SUBTOTAL: formatInvoiceMoney(sale.subtotal, currency),
    DISCOUNT_ROW: discountRow,
    GST_LABEL: gstLabel,
    TAX_AMOUNT: formatInvoiceMoney(sale.taxAmount, currency),
    TOTAL: formatInvoiceMoney(sale.totalAmount, currency),
    PAYMENT_METHOD: escapeHtml((sale.primaryPaymentMethod || 'cash').toUpperCase()),
    PAID_AMOUNT: formatInvoiceMoney(sale.paidAmount, currency),
    PAYMENT_ALLOCATION_ROWS: buildPaymentAllocationRows(sale, currency),
    PENDING_AMOUNT: formatInvoiceMoney(
      sale.totalPendingAfter !== null && sale.totalPendingAfter !== undefined
        ? sale.totalPendingAfter
        : sale.pendingAmount,
      currency
    ),
    PAYMENT_STATUS: paymentStatusLabel(sale),
  };

  return Object.entries(replacements).reduce(
    (html, [key, value]) => html.replaceAll(`{{${key}}}`, value),
    template
  );
};
