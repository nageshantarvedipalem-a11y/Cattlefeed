import {
  findSales,
  findSaleById,
  findSaleItems,
  findSalePayments,
  createSaleRecord,
  createSaleItemRecord,
  createSalePaymentRecord,
  formatSale,
  searchPosProducts,
  getConnection,
} from '../repositories/sale.repository.js';
import {
  findAvailableStockBatches,
  findStockBatchProducts,
} from '../repositories/stockBatch.repository.js';
import {
  createStockMovementRecord,
  getProductStockForUpdate,
  updateProductStock,
} from '../repositories/stockMovement.repository.js';
import {
  getLatestCustomerBalance,
  createLedgerEntry,
} from '../repositories/customerLedger.repository.js';
import {
  getLatestCashBalance,
  createCashBookEntry,
} from '../repositories/cashBook.repository.js';
import {
  findCustomerById,
  findCustomerByPhone,
  createCustomerRecord,
  updateCustomerRecord,
} from '../repositories/customer.repository.js';
import { createPaymentRecord } from '../repositories/payment.repository.js';
import { getNextInvoiceNumber, getCompanySettings } from '../repositories/settings.repository.js';
import { buildInvoicePdf, buildThermalInvoicePdf } from '../helpers/invoicePdf.helper.js';
import { buildInvoiceHtml } from '../helpers/invoiceHtml.helper.js';
import { logActivity } from '../repositories/activityLog.repository.js';
import whatsappService from './whatsapp.service.js';
import { AppError } from '../utils/apiResponse.js';
import { validateIndianMobile } from '../utils/phoneValidation.js';

const PAYMENT_METHODS = ['cash', 'upi', 'card', 'bank', 'credit'];
const CASH_BOOK_METHODS = ['cash', 'upi', 'card', 'bank'];

const calculateSaleItem = (item) => {
  const quantity = Number(item.quantity);
  const sellingPrice = Number(item.sellingPrice);
  const purchasePrice = Number(item.purchasePrice);
  const gstRate = Number(item.gstRate) || 0;
  const discountAmount = Number(item.discountAmount) || 0;

  const lineSubtotal = quantity * sellingPrice;
  const taxableAmount = Math.max(lineSubtotal - discountAmount, 0);
  const taxAmount = (taxableAmount * gstRate) / 100;
  const totalAmount = taxableAmount + taxAmount;
  const profitAmount = (sellingPrice * quantity) - (purchasePrice * quantity) - discountAmount;

  return {
    quantity,
    sellingPrice,
    purchasePrice,
    gstRate,
    discountAmount,
    lineSubtotal,
    taxAmount,
    totalAmount,
    profitAmount,
  };
};

const resolvePrimaryPaymentMethod = (payments) => {
  if (payments.length === 0) return 'cash';
  if (payments.length > 1) return 'split';
  return payments[0].paymentMethod;
};

const resolvePaymentStatus = (paidAmount, totalAmount) => {
  if (paidAmount >= totalAmount) return 'paid';
  if (paidAmount > 0) return 'partial';
  return 'pending';
};

export class BillingService {
  async listStockBatches(queryParams) {
    const batches = await findAvailableStockBatches(queryParams.search?.trim() || '');
    return { batches };
  }

  async listStockBatchProducts(purchaseId, queryParams) {
    const products = await findStockBatchProducts(
      purchaseId,
      queryParams.search?.trim() || '',
      queryParams.barcode?.trim() || ''
    );
    return { products, purchaseId };
  }

  async searchProducts(queryParams) {
    const products = await searchPosProducts(
      queryParams.search?.trim() || '',
      queryParams.barcode?.trim() || ''
    );
    return { products };
  }

  async listSales(queryParams) {
    const page = Math.max(parseInt(queryParams.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(queryParams.limit, 10) || 10, 1), 100);

    const { sales, total } = await findSales({
      search: queryParams.search?.trim() || '',
      customerId: queryParams.customerId || null,
      paymentStatus: queryParams.paymentStatus || null,
      dateFrom: queryParams.dateFrom || null,
      dateTo: queryParams.dateTo || null,
      page,
      limit,
      sortBy: queryParams.sortBy || 'createdAt',
      sortOrder: queryParams.sortOrder || 'desc',
    });

    return {
      sales,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async getSaleById(saleId) {
    const sale = await findSaleById(saleId);
    if (!sale) {
      throw new AppError('Sale not found', 404);
    }

    const [items, payments] = await Promise.all([
      findSaleItems(saleId),
      findSalePayments(saleId),
    ]);

    return { sale: formatSale(sale, items, payments) };
  }

  async createSale(currentUser, data, ipAddress) {
    if (!Array.isArray(data.items) || data.items.length === 0) {
      throw new AppError('At least one product is required', 400);
    }

    const connection = await getConnection();
    try {
      await connection.beginTransaction();

      let customerId = data.customerId || null;

      if (!customerId && data.customer?.phone) {
        const phoneCheck = validateIndianMobile(data.customer.phone);
        if (!phoneCheck.valid) {
          throw new AppError(phoneCheck.error, 400);
        }

        const phone = phoneCheck.display;
        const existing = await findCustomerByPhone(phone);

        if (existing) {
          customerId = existing.id;
          const newName = String(data.customer.name || '').trim();
          if (newName) {
            await updateCustomerRecord(connection, customerId, {
              name: newName,
              village: data.customer.village?.trim() || null,
              address: data.customer.address?.trim() || null,
            });
          }
        } else {
          customerId = await createCustomerRecord(connection, {
            name: String(data.customer.name || 'Customer').trim(),
            phone,
            village: data.customer.village?.trim() || null,
            address: data.customer.address?.trim() || null,
            notes: data.customer.notes?.trim() || null,
            openingBalance: 0,
            openingBalanceType: 'debit',
            creditLimit: 0,
            isActive: true,
          });
        }
      } else if (customerId) {
        const customer = await findCustomerById(customerId);
        if (!customer) {
          throw new AppError('Customer not found', 404);
        }
        if (!customer.is_active) {
          throw new AppError('Selected customer is inactive', 400);
        }
        if (data.customer?.name?.trim() || data.customer?.village?.trim() || data.customer?.address?.trim()) {
          await updateCustomerRecord(connection, customerId, {
            name: data.customer?.name?.trim() || customer.name,
            village: data.customer?.village?.trim() || customer.village || null,
            address: data.customer?.address?.trim() || customer.address || null,
          });
        }
      }

      const payments = Array.isArray(data.payments) ? data.payments : [];
      if (payments.length === 0) {
        throw new AppError('Payment details are required', 400);
      }

      for (const payment of payments) {
        if (!PAYMENT_METHODS.includes(payment.paymentMethod)) {
          throw new AppError(`Invalid payment method: ${payment.paymentMethod}`, 400);
        }
        if (Number(payment.amount) <= 0) {
          throw new AppError('Payment amount must be greater than 0', 400);
        }
      }

      const processedItems = [];
      for (const item of data.items) {
        const product = await getProductStockForUpdate(connection, item.productId);
        if (!product) {
          throw new AppError(`Product not found (ID: ${item.productId})`, 404);
        }

        const calculated = calculateSaleItem({
          ...item,
          sellingPrice: item.sellingPrice ?? product.selling_price,
          purchasePrice: item.purchasePrice ?? product.purchase_price,
          gstRate: item.gstRate ?? product.gst_rate,
        });

        if (calculated.quantity <= 0) {
          throw new AppError(`Invalid quantity for ${product.name}`, 400);
        }

        if (Number(product.current_stock) < calculated.quantity) {
          throw new AppError(
            `Insufficient stock for ${product.name}. Available: ${product.current_stock}`,
            400
          );
        }

        processedItems.push({
          productId: item.productId,
          productName: product.name,
          ...calculated,
        });
      }

      const itemsSubtotal = processedItems.reduce((sum, item) => sum + item.lineSubtotal, 0);
      const itemsTax = processedItems.reduce((sum, item) => sum + item.taxAmount, 0);
      const itemsDiscount = processedItems.reduce((sum, item) => sum + item.discountAmount, 0);
      const billDiscount = Number(data.discountAmount) || 0;
      const subtotal = itemsSubtotal;
      const taxAmount = itemsTax;
      const discountAmount = itemsDiscount + billDiscount;
      const totalAmount = Math.max(subtotal + taxAmount - billDiscount, 0);

      const previousPendingBalance = customerId
        ? await getLatestCustomerBalance(connection, customerId)
        : 0;

      const amountReceived = payments
        .filter((p) => p.paymentMethod !== 'credit')
        .reduce((sum, p) => sum + Number(p.amount), 0);
      const creditAmount = payments
        .filter((p) => p.paymentMethod === 'credit')
        .reduce((sum, p) => sum + Number(p.amount), 0);

      const maxPayable = totalAmount + (customerId ? previousPendingBalance : 0);
      if (amountReceived + creditAmount > maxPayable + 0.01) {
        throw new AppError(
          customerId
            ? `Paid amount cannot exceed bill total plus existing pending balance (${maxPayable.toFixed(2)})`
            : 'Paid amount cannot exceed total amount',
          400
        );
      }

      if (amountReceived > totalAmount + 0.01 && !customerId) {
        throw new AppError('Select an existing customer to apply extra payment toward old pending balance', 400);
      }

      const trackPendingBalance = data.trackPendingBalance !== false;
      let finalTotalAmount = totalAmount;
      let finalDiscountAmount = discountAmount;

      let paidOnNewBill = Math.min(amountReceived, finalTotalAmount);
      let pendingAmount = Math.max(finalTotalAmount - paidOnNewBill, 0);

      if (!trackPendingBalance && pendingAmount > 0) {
        finalDiscountAmount += pendingAmount;
        finalTotalAmount = paidOnNewBill;
        pendingAmount = 0;
      }

      const remainingAfterNewBill = Math.max(amountReceived - paidOnNewBill, 0);
      const oldBalancePaid = customerId
        ? Math.min(remainingAfterNewBill, Math.max(previousPendingBalance, 0))
        : 0;
      const finalPaidAmount = paidOnNewBill;
      const totalPendingAfter = previousPendingBalance - oldBalancePaid + pendingAmount;

      const hasCreditPayment = payments.some((p) => p.paymentMethod === 'credit');

      if (pendingAmount > 0 && !customerId) {
        throw new AppError('Customer name and mobile are required for partial or credit bills', 400);
      }

      if (hasCreditPayment && !customerId) {
        throw new AppError('Customer name and mobile are required for credit bills', 400);
      }

      if (hasCreditPayment && !trackPendingBalance) {
        throw new AppError('Credit bills must track pending balance', 400);
      }

      const invoiceNumber = await getNextInvoiceNumber(connection);
      const saleDate = data.saleDate ? new Date(data.saleDate) : new Date();

      const saleId = await createSaleRecord(connection, {
        invoiceNumber,
        customerId,
        saleDate,
        subtotal,
        taxAmount,
        discountAmount: finalDiscountAmount,
        totalAmount: finalTotalAmount,
        paidAmount: finalPaidAmount,
        pendingAmount,
        previousPendingBalance,
        oldBalancePaid,
        amountReceived,
        totalPendingAfter: customerId ? totalPendingAfter : null,
        paymentStatus: resolvePaymentStatus(finalPaidAmount, finalTotalAmount),
        primaryPaymentMethod: resolvePrimaryPaymentMethod(payments),
        dueDate: data.dueDate || null,
        remarks: data.remarks?.trim() || null,
        createdBy: currentUser.id,
      });

      for (const item of processedItems) {
        await createSaleItemRecord(connection, {
          saleId,
          productId: item.productId,
          quantity: item.quantity,
          purchasePrice: item.purchasePrice,
          sellingPrice: item.sellingPrice,
          gstRate: item.gstRate,
          taxAmount: item.taxAmount,
          discountAmount: item.discountAmount,
          totalAmount: item.totalAmount,
          profitAmount: item.profitAmount,
        });

        const productRow = await getProductStockForUpdate(connection, item.productId);
        const newStock = Number(productRow.current_stock) - item.quantity;

        await updateProductStock(connection, item.productId, newStock);

        await createStockMovementRecord(connection, {
          productId: item.productId,
          movementType: 'out',
          quantity: item.quantity,
          referenceType: 'sale',
          referenceId: saleId,
          purchasePrice: item.purchasePrice,
          sellingPrice: item.sellingPrice,
          balanceAfter: newStock,
          remarks: `Stock out via sale ${invoiceNumber}`,
          createdBy: currentUser.id,
        });
      }

      let recordedSalePayment = 0;
      for (const payment of payments) {
        if (payment.paymentMethod === 'credit') {
          await createSalePaymentRecord(connection, {
            saleId,
            paymentMethod: payment.paymentMethod,
            amount: Number(payment.amount),
            referenceNumber: payment.referenceNumber?.trim() || null,
          });
          continue;
        }

        const salePaymentAmount = Math.min(
          Number(payment.amount),
          Math.max(finalPaidAmount - recordedSalePayment, 0)
        );
        if (salePaymentAmount <= 0) continue;

        recordedSalePayment += salePaymentAmount;
        await createSalePaymentRecord(connection, {
          saleId,
          paymentMethod: payment.paymentMethod,
          amount: salePaymentAmount,
          referenceNumber: payment.referenceNumber?.trim() || null,
        });
      }

      let runningBalance = previousPendingBalance;

      if (customerId && pendingAmount > 0) {
        runningBalance += pendingAmount;
        await createLedgerEntry(connection, {
          customerId,
          transactionDate: saleDate,
          transactionType: 'sale',
          referenceType: 'sale',
          referenceId: saleId,
          debit: pendingAmount,
          credit: 0,
          balance: runningBalance,
          remarks: `Sale ${invoiceNumber} — pending amount`,
          createdBy: currentUser.id,
        });
      }

      if (customerId && oldBalancePaid > 0) {
        const paymentDate = saleDate.toISOString().slice(0, 10);
        const primaryMethod = payments.find((p) => p.paymentMethod !== 'credit')?.paymentMethod || 'cash';

        const paymentId = await createPaymentRecord(connection, {
          customerId,
          saleId,
          paymentDate,
          amount: oldBalancePaid,
          paymentMethod: primaryMethod,
          referenceNumber: null,
          remarks: `Old balance payment via sale ${invoiceNumber}`,
          createdBy: currentUser.id,
        });

        runningBalance -= oldBalancePaid;
        await createLedgerEntry(connection, {
          customerId,
          transactionDate: saleDate,
          transactionType: 'payment',
          referenceType: 'payment',
          referenceId: paymentId,
          debit: 0,
          credit: oldBalancePaid,
          balance: runningBalance,
          remarks: `Old balance payment via sale ${invoiceNumber}`,
          createdBy: currentUser.id,
        });
      }

      let cashBalance = await getLatestCashBalance(connection);
      if (finalPaidAmount > 0) {
        const primaryMethod = payments.find((p) => p.paymentMethod !== 'credit')?.paymentMethod || 'cash';
        if (CASH_BOOK_METHODS.includes(primaryMethod)) {
          cashBalance += finalPaidAmount;
          await createCashBookEntry(connection, {
            transactionDate: saleDate.toISOString().slice(0, 10),
            transactionType: 'income',
            category: 'Sales',
            amount: finalPaidAmount,
            paymentMethod: primaryMethod,
            referenceType: 'sale',
            referenceId: saleId,
            balanceAfter: cashBalance,
            remarks: `Sale ${invoiceNumber} — ${primaryMethod}`,
            createdBy: currentUser.id,
          });
        }
      }

      if (oldBalancePaid > 0) {
        const primaryMethod = payments.find((p) => p.paymentMethod !== 'credit')?.paymentMethod || 'cash';
        if (CASH_BOOK_METHODS.includes(primaryMethod)) {
          cashBalance += oldBalancePaid;
          await createCashBookEntry(connection, {
            transactionDate: saleDate.toISOString().slice(0, 10),
            transactionType: 'income',
            category: 'Customer Payment',
            amount: oldBalancePaid,
            paymentMethod: primaryMethod,
            referenceType: 'payment',
            referenceId: saleId,
            balanceAfter: cashBalance,
            remarks: `Old balance via sale ${invoiceNumber}`,
            createdBy: currentUser.id,
          });
        }
      }

      await connection.commit();

      await logActivity({
        userId: currentUser.id,
        action: 'sale_created',
        entityType: 'sale',
        entityId: saleId,
        details: { invoiceNumber, totalAmount: finalTotalAmount, paidAmount: finalPaidAmount, pendingAmount },
        ipAddress,
      });

      const saleResult = await this.getSaleById(saleId);
      const whatsapp = await whatsappService.tryAutoSendInvoice(saleId, currentUser, ipAddress);

      return { ...saleResult, whatsapp };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async getInvoiceHtml(saleId) {
    const { sale } = await this.getSaleById(saleId);
    const company = await getCompanySettings();
    return {
      html: buildInvoiceHtml(sale, company),
      filename: `${sale.invoiceNumber}.html`,
    };
  }

  async downloadInvoicePdf(saleId, thermal = false) {
    const { sale } = await this.getSaleById(saleId);
    const company = await getCompanySettings();
    const buffer = thermal
      ? await buildThermalInvoicePdf(sale, company)
      : await buildInvoicePdf(sale, company);

    return {
      buffer,
      filename: `${sale.invoiceNumber}${thermal ? '-thermal' : ''}.pdf`,
      contentType: 'application/pdf',
    };
  }
}

export default new BillingService();
