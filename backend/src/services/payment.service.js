import {
  findPendingSales,
  findPendingSalesForExport,
  findPendingCustomers,
  findPendingCustomerById,
  findCustomerPaymentInvoices,
  getPendingPaymentsSummary,
  findPayments,
  findPaymentById,
  getConnection,
} from '../repositories/payment.repository.js';
import {
  findSaleById,
  formatSale,
} from '../repositories/sale.repository.js';
import { postCashBookEntry } from '../helpers/cashBookPost.helper.js';
import { allocateAmountToPendingSales } from '../helpers/paymentAllocation.helper.js';
import { getCompanySettings } from '../repositories/settings.repository.js';
import { buildPaymentReceiptPdf } from '../helpers/paymentReceiptPdf.helper.js';
import whatsappService from './whatsapp.service.js';
import { buildPendingPaymentsWorkbook } from '../helpers/exportExcel.helper.js';
import { buildPendingPaymentsPdf } from '../helpers/exportPdf.helper.js';
import { logActivity } from '../repositories/activityLog.repository.js';
import { AppError } from '../utils/apiResponse.js';

const VALID_METHODS = ['cash', 'upi', 'card', 'bank'];

export class PaymentService {
  async getPendingPayments(queryParams) {
    const page = Math.max(parseInt(queryParams.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(queryParams.limit, 10) || 10, 1), 100);

    const filters = {
      search: queryParams.search?.trim() || '',
      customerId: queryParams.customerId || null,
      overdueOnly: queryParams.overdueOnly === 'true' || queryParams.overdueOnly === true,
      period: queryParams.period || null,
      dateFrom: queryParams.dateFrom || null,
      dateTo: queryParams.dateTo || null,
    };

    const customerSortBy = ['lastSaleDate', 'invoiceCount', 'totalAmount', 'pendingAmount', 'customerName']
      .includes(queryParams.sortBy)
      ? queryParams.sortBy
      : 'lastSaleDate';
    const saleSortBy = ['dueDate', 'pendingAmount', 'saleDate', 'customerName', 'invoiceNumber']
      .includes(queryParams.sortBy)
      ? queryParams.sortBy
      : 'dueDate';

    const [summary, customerResult, salesResult] = await Promise.all([
      getPendingPaymentsSummary(filters),
      findPendingCustomers({
        ...filters,
        page,
        limit,
        sortBy: customerSortBy,
        sortOrder: queryParams.sortOrder || 'desc',
      }),
      findPendingSales({
        ...filters,
        page,
        limit,
        sortBy: saleSortBy,
        sortOrder: queryParams.sortOrder || 'asc',
      }),
    ]);

    return {
      summary,
      pendingCustomers: customerResult.pendingCustomers || [],
      pendingSales: salesResult.pendingSales || [],
      pagination: {
        page,
        limit,
        total: salesResult.total,
        totalPages: Math.ceil(salesResult.total / limit) || 1,
      },
      customerPagination: {
        page,
        limit,
        total: customerResult.total,
        totalPages: Math.ceil(customerResult.total / limit) || 1,
      },
    };
  }

  async getPendingCustomerDetail(customerId) {
    const invoices = await findCustomerPaymentInvoices(customerId);
    if (!invoices.length) {
      throw new AppError('No bills found for this customer', 404);
    }

    const customer = await findPendingCustomerById(customerId) || {
      customerId: Number(customerId),
      customerName: invoices[0].customerName,
      customerPhone: invoices[0].customerPhone,
      customerVillage: invoices[0].customerVillage,
      invoiceCount: invoices.length,
      totalAmount: invoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount), 0),
      paidAmount: invoices.reduce((sum, invoice) => sum + Number(invoice.paidAmount), 0),
      pendingAmount: invoices.reduce((sum, invoice) => sum + Number(invoice.pendingAmount), 0),
      firstSaleDate: invoices[invoices.length - 1]?.saleDate,
      lastSaleDate: invoices[0]?.saleDate,
      earliestDueDate: null,
      overdueCount: 0,
      overdueAmount: 0,
      isOverdue: false,
      paymentStatus: 'paid',
      customerPendingTotal: 0,
    };

    const { payments } = await findPayments({
      customerId,
      page: 1,
      limit: 100,
      sortOrder: 'desc',
    });

    return { customer, invoices, payments };
  }

  async getPaymentHistory(queryParams) {
    const page = Math.max(parseInt(queryParams.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(queryParams.limit, 10) || 10, 1), 100);

    const { payments, total } = await findPayments({
      search: queryParams.search?.trim() || '',
      customerId: queryParams.customerId || null,
      saleId: queryParams.saleId || null,
      period: queryParams.period || null,
      dateFrom: queryParams.dateFrom || null,
      dateTo: queryParams.dateTo || null,
      page,
      limit,
      sortOrder: queryParams.sortOrder || 'desc',
    });

    return {
      payments,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async getPaymentById(paymentId) {
    const payment = await findPaymentById(paymentId);
    if (!payment) {
      throw new AppError('Payment not found', 404);
    }
    return { payment };
  }

  async receivePayment(currentUser, data, ipAddress) {
    let saleRow = null;
    if (data.saleId) {
      saleRow = await findSaleById(data.saleId);
      if (!saleRow) {
        throw new AppError('Sale not found', 404);
      }
      if (!saleRow.customer_id) {
        throw new AppError('Sale has no associated customer', 400);
      }
      if (Number(saleRow.pending_amount) <= 0) {
        throw new AppError('This invoice has no pending amount', 400);
      }
    } else if (data.customerId) {
      const customer = await findPendingCustomerById(data.customerId);
      if (!customer) {
        throw new AppError('No pending payments found for this customer', 404);
      }
      const invoices = await findCustomerPaymentInvoices(data.customerId);
      const oldestPending = [...invoices]
        .filter((invoice) => Number(invoice.pendingAmount) > 0)
        .sort((a, b) => new Date(a.saleDate) - new Date(b.saleDate))[0];
      if (!oldestPending) {
        throw new AppError('No pending invoices for this customer', 400);
      }
      saleRow = await findSaleById(oldestPending.id);
    } else {
      throw new AppError('Sale or customer is required', 400);
    }

    const amount = Number(data.amount);
    if (amount <= 0) {
      throw new AppError('Payment amount must be greater than 0', 400);
    }
    if (!VALID_METHODS.includes(data.paymentMethod)) {
      throw new AppError('Invalid payment method', 400);
    }

    const sendUpdatedBill = data.sendUpdatedBill !== false;
    const preferSaleId = data.saleId ? saleRow.id : null;
    const connection = await getConnection();
    try {
      await connection.beginTransaction();

      const paymentDate = data.paymentDate
        ? (typeof data.paymentDate === 'string' ? data.paymentDate.slice(0, 10) : new Date(data.paymentDate).toISOString().slice(0, 10))
        : new Date().toISOString().slice(0, 10);

      const allocation = await allocateAmountToPendingSales(connection, {
        customerId: saleRow.customer_id,
        amount,
        paymentMethod: data.paymentMethod,
        paymentDate,
        referenceNumber: data.referenceNumber?.trim() || null,
        remarks: data.remarks?.trim() || (
          preferSaleId
            ? `Payment received for ${saleRow.invoice_number}`
            : `Payment received from ${saleRow.customer_name}`
        ),
        createdBy: currentUser.id,
        preferSaleId,
      });

      const allocatedToInvoices = allocation.updatedSales.reduce((sum, item) => sum + Number(item.applied), 0);
      if (allocatedToInvoices + 0.01 < amount) {
        throw new AppError(
          `Payment amount cannot exceed this customer's pending balance of ${allocatedToInvoices.toFixed(2)}`,
          400
        );
      }

      const primaryAllocation = allocation.updatedSales.find((item) => item.id === saleRow.id)
        || allocation.updatedSales[0];
      const paymentId = primaryAllocation?.paymentId || null;

      await postCashBookEntry(connection, {
        transactionDate: paymentDate,
        transactionType: 'income',
        category: 'Customer Payment',
        description: 'Customer payment',
        amount,
        paymentMethod: data.paymentMethod,
        referenceType: 'customer_payment',
        referenceId: paymentId,
        referenceNumber: preferSaleId ? saleRow.invoice_number : saleRow.customer_name,
        remarks: preferSaleId
          ? `Payment for ${saleRow.invoice_number}`
          : `Payment from ${saleRow.customer_name}`,
        partyName: saleRow.customer_name || null,
        partyType: saleRow.customer_id ? 'customer' : null,
        partyId: saleRow.customer_id || null,
        source: 'billing',
        createdBy: currentUser.id,
      }, { allowNegative: true });

      await connection.commit();

      await logActivity({
        userId: currentUser.id,
        action: 'payment_received',
        entityType: 'payment',
        entityId: paymentId,
        details: {
          saleId: saleRow.id,
          invoiceNumber: saleRow.invoice_number,
          amount,
          allocatedInvoices: allocation.updatedSales.map((item) => item.invoiceNumber),
        },
        ipAddress,
      });

      const payment = paymentId ? await findPaymentById(paymentId) : null;
      const updatedSale = await findSaleById(saleRow.id);

      const whatsappResults = [];
      if (sendUpdatedBill) {
        for (const updated of allocation.updatedSales) {
          const result = await whatsappService.trySendUpdatedInvoice(
            updated.id,
            currentUser,
            ipAddress
          );
          whatsappResults.push({
            saleId: updated.id,
            invoiceNumber: updated.invoiceNumber,
            fullyPaid: updated.fullyPaid,
            ...result,
          });
        }
      }

      const primaryWhatsapp = whatsappResults.find((item) => item.saleId === saleRow.id)
        || whatsappResults[0]
        || { sent: false, reason: sendUpdatedBill ? 'No invoices updated' : 'Send bill not requested' };

      return {
        payment,
        sale: formatSale(updatedSale),
        allocations: allocation.updatedSales,
        whatsapp: primaryWhatsapp,
        whatsappResults,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async downloadReceipt(paymentId) {
    const payment = await findPaymentById(paymentId);
    if (!payment) {
      throw new AppError('Payment not found', 404);
    }

    let sale = null;
    if (payment.saleId) {
      const saleRow = await findSaleById(payment.saleId);
      if (saleRow) {
        sale = formatSale(saleRow);
      }
    }

    const company = await getCompanySettings();
    const buffer = await buildPaymentReceiptPdf(payment, sale, company);

    return {
      buffer,
      filename: `receipt-PAY-${String(payment.id).padStart(5, '0')}.pdf`,
      contentType: 'application/pdf',
    };
  }

  async getWhatsAppReminder(saleId) {
    return whatsappService.getReminderLink(saleId);
  }

  async sendWhatsAppReminder(saleId, currentUser, ipAddress) {
    return whatsappService.sendPaymentReminder(saleId, currentUser, ipAddress);
  }

  async exportPendingPayments(queryParams, format) {
    const filters = {
      search: queryParams.search?.trim() || '',
      customerId: queryParams.customerId || null,
      overdueOnly: queryParams.overdueOnly === 'true' || queryParams.overdueOnly === true,
      period: queryParams.period || null,
      dateFrom: queryParams.dateFrom || null,
      dateTo: queryParams.dateTo || null,
    };

    const [pendingSales, summary, { pendingCustomers }] = await Promise.all([
      findPendingSalesForExport(filters),
      getPendingPaymentsSummary(filters),
      findPendingCustomers({ ...filters, page: 1, limit: 10000 }),
    ]);

    if (format === 'excel') {
      const workbook = await buildPendingPaymentsWorkbook(pendingSales, summary, pendingCustomers);
      const buffer = await workbook.xlsx.writeBuffer();
      return {
        buffer,
        filename: `pending-payments-${Date.now()}.xlsx`,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
    }

    const buffer = await buildPendingPaymentsPdf(pendingSales, summary);
    return {
      buffer,
      filename: `pending-payments-${Date.now()}.pdf`,
      contentType: 'application/pdf',
    };
  }
}

export default new PaymentService();
