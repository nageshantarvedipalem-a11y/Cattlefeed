import {
  findPendingSales,
  findPendingSalesForExport,
  getPendingPaymentsSummary,
  findPayments,
  findPaymentById,
  createPaymentRecord,
  getConnection,
} from '../repositories/payment.repository.js';
import {
  findSaleById,
  createSalePaymentRecord,
  updateSalePaymentAmounts,
  formatSale,
} from '../repositories/sale.repository.js';
import {
  getLatestCustomerBalance,
  createLedgerEntry,
} from '../repositories/customerLedger.repository.js';
import {
  getLatestCashBalance,
  createCashBookEntry,
} from '../repositories/cashBook.repository.js';
import { getCompanySettings } from '../repositories/settings.repository.js';
import { buildPaymentReceiptPdf } from '../helpers/paymentReceiptPdf.helper.js';
import whatsappService from './whatsapp.service.js';
import { buildPendingPaymentsWorkbook } from '../helpers/exportExcel.helper.js';
import { buildPendingPaymentsPdf } from '../helpers/exportPdf.helper.js';
import { logActivity } from '../repositories/activityLog.repository.js';
import { AppError } from '../utils/apiResponse.js';

const VALID_METHODS = ['cash', 'upi', 'card', 'bank'];

const resolvePaymentStatus = (paidAmount, totalAmount) => {
  if (paidAmount >= totalAmount) return 'paid';
  if (paidAmount > 0) return 'partial';
  return 'pending';
};

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

    const [summary, { pendingSales, total }] = await Promise.all([
      getPendingPaymentsSummary(filters),
      findPendingSales({
        ...filters,
        page,
        limit,
        sortBy: queryParams.sortBy || 'dueDate',
        sortOrder: queryParams.sortOrder || 'asc',
      }),
    ]);

    return {
      summary,
      pendingSales,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
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
    const saleRow = await findSaleById(data.saleId);
    if (!saleRow) {
      throw new AppError('Sale not found', 404);
    }
    if (!saleRow.customer_id) {
      throw new AppError('Sale has no associated customer', 400);
    }

    const pendingAmount = Number(saleRow.pending_amount);
    if (pendingAmount <= 0) {
      throw new AppError('This invoice has no pending amount', 400);
    }

    const amount = Number(data.amount);
    if (amount <= 0) {
      throw new AppError('Payment amount must be greater than 0', 400);
    }
    if (amount > pendingAmount + 0.01) {
      throw new AppError(`Payment amount cannot exceed pending balance of ${pendingAmount}`, 400);
    }

    if (!VALID_METHODS.includes(data.paymentMethod)) {
      throw new AppError('Invalid payment method', 400);
    }

    const connection = await getConnection();
    try {
      await connection.beginTransaction();

      const newPaidAmount = Number(saleRow.paid_amount) + amount;
      const newPendingAmount = Math.max(pendingAmount - amount, 0);
      const paymentStatus = resolvePaymentStatus(newPaidAmount, Number(saleRow.total_amount));

      await updateSalePaymentAmounts(connection, saleRow.id, {
        paidAmount: newPaidAmount,
        pendingAmount: newPendingAmount,
        paymentStatus,
      });

      await createSalePaymentRecord(connection, {
        saleId: saleRow.id,
        paymentMethod: data.paymentMethod,
        amount,
        referenceNumber: data.referenceNumber?.trim() || null,
      });

      const paymentDate = data.paymentDate
        ? (typeof data.paymentDate === 'string' ? data.paymentDate.slice(0, 10) : new Date(data.paymentDate).toISOString().slice(0, 10))
        : new Date().toISOString().slice(0, 10);

      const paymentId = await createPaymentRecord(connection, {
        customerId: saleRow.customer_id,
        saleId: saleRow.id,
        paymentDate,
        amount,
        paymentMethod: data.paymentMethod,
        referenceNumber: data.referenceNumber?.trim() || null,
        remarks: data.remarks?.trim() || null,
        createdBy: currentUser.id,
      });

      const previousBalance = await getLatestCustomerBalance(connection, saleRow.customer_id);
      const newBalance = previousBalance - amount;

      await createLedgerEntry(connection, {
        customerId: saleRow.customer_id,
        transactionDate: paymentDate,
        transactionType: 'payment',
        referenceType: 'payment',
        referenceId: paymentId,
        debit: 0,
        credit: amount,
        balance: newBalance,
        remarks: data.remarks?.trim() || `Payment received for ${saleRow.invoice_number}`,
        createdBy: currentUser.id,
      });

      const cashBalance = await getLatestCashBalance(connection) + amount;
      await createCashBookEntry(connection, {
        transactionDate: paymentDate,
        transactionType: 'income',
        category: 'Customer Payment',
        amount,
        paymentMethod: data.paymentMethod,
        referenceType: 'payment',
        referenceId: paymentId,
        balanceAfter: cashBalance,
        remarks: `Payment for ${saleRow.invoice_number}`,
        createdBy: currentUser.id,
      });

      await connection.commit();

      await logActivity({
        userId: currentUser.id,
        action: 'payment_received',
        entityType: 'payment',
        entityId: paymentId,
        details: { saleId: saleRow.id, invoiceNumber: saleRow.invoice_number, amount },
        ipAddress,
      });

      const payment = await findPaymentById(paymentId);
      const updatedSale = await findSaleById(saleRow.id);

      return {
        payment,
        sale: formatSale(updatedSale),
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

    const [pendingSales, summary] = await Promise.all([
      findPendingSalesForExport(filters),
      getPendingPaymentsSummary(filters),
    ]);

    if (format === 'excel') {
      const workbook = await buildPendingPaymentsWorkbook(pendingSales, summary);
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
