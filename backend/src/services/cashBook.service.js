import {
  findCashBookEntries,
  findCashBookEntriesForExport,
  getCashBookPeriodSummary,
  getLatestCashBalance,
  createCashBookEntry,
  isInflowType,
  isOutflowType,
  getConnection,
} from '../repositories/cashBook.repository.js';
import { createExpenseRecord } from '../repositories/expense.repository.js';
import { logActivity } from '../repositories/activityLog.repository.js';
import { buildCashBookWorkbook } from '../helpers/exportExcel.helper.js';
import { buildCashBookPdf } from '../helpers/exportPdf.helper.js';
import { AppError } from '../utils/apiResponse.js';

const VALID_TYPES = ['cash_in', 'cash_out', 'income', 'expense', 'transfer'];
const VALID_METHODS = ['cash', 'upi', 'card', 'bank'];
const MANUAL_TYPES = ['cash_in', 'cash_out', 'expense', 'transfer'];

export class CashBookService {
  async getCashBook(queryParams) {
    const page = Math.max(parseInt(queryParams.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(queryParams.limit, 10) || 10, 1), 100);

    const filters = {
      search: queryParams.search?.trim() || '',
      transactionType: queryParams.transactionType || null,
      paymentMethod: queryParams.paymentMethod || null,
      period: queryParams.period || null,
      dateFrom: queryParams.dateFrom || null,
      dateTo: queryParams.dateTo || null,
    };

    const [summary, { entries, total }] = await Promise.all([
      getCashBookPeriodSummary(filters),
      findCashBookEntries({ ...filters, page, limit, sortOrder: queryParams.sortOrder || 'desc' }),
    ]);

    return {
      summary,
      entries,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async createEntry(currentUser, data, ipAddress) {
    if (!MANUAL_TYPES.includes(data.transactionType)) {
      throw new AppError('Invalid transaction type for manual entry', 400);
    }

    if (!VALID_METHODS.includes(data.paymentMethod)) {
      throw new AppError('Invalid payment method', 400);
    }

    const amount = Number(data.amount);
    if (amount <= 0) {
      throw new AppError('Amount must be greater than 0', 400);
    }

    const connection = await getConnection();
    try {
      await connection.beginTransaction();

      const previousBalance = await getLatestCashBalance(connection);
      let newBalance = previousBalance;

      if (isInflowType(data.transactionType)) {
        newBalance += amount;
      } else if (isOutflowType(data.transactionType)) {
        if (previousBalance < amount) {
          throw new AppError(`Insufficient cash balance. Available: ${previousBalance}`, 400);
        }
        newBalance -= amount;
      }

      const transactionDate = data.transactionDate
        ? (typeof data.transactionDate === 'string' ? data.transactionDate.slice(0, 10) : new Date(data.transactionDate).toISOString().slice(0, 10))
        : new Date().toISOString().slice(0, 10);

      const entryId = await createCashBookEntry(connection, {
        transactionDate,
        transactionType: data.transactionType,
        category: data.category?.trim() || null,
        amount,
        paymentMethod: data.paymentMethod,
        referenceType: 'manual',
        referenceId: null,
        balanceAfter: newBalance,
        remarks: data.remarks?.trim() || null,
        createdBy: currentUser.id,
      });

      if (data.transactionType === 'expense') {
        await createExpenseRecord(connection, {
          expenseDate: transactionDate,
          category: data.category?.trim() || 'General',
          amount,
          paymentMethod: data.paymentMethod,
          description: data.remarks?.trim() || null,
          createdBy: currentUser.id,
        });
      }

      await connection.commit();

      await logActivity({
        userId: currentUser.id,
        action: 'cashbook_entry_created',
        entityType: 'cash_book',
        entityId: entryId,
        details: { transactionType: data.transactionType, amount },
        ipAddress,
      });

      return {
        entry: {
          id: entryId,
          transactionType: data.transactionType,
          amount,
          balanceAfter: newBalance,
        },
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async exportCashBook(queryParams, format) {
    const filters = {
      search: queryParams.search?.trim() || '',
      transactionType: queryParams.transactionType || null,
      paymentMethod: queryParams.paymentMethod || null,
      period: queryParams.period || null,
      dateFrom: queryParams.dateFrom || null,
      dateTo: queryParams.dateTo || null,
    };

    const [entries, summary] = await Promise.all([
      findCashBookEntriesForExport(filters),
      getCashBookPeriodSummary(filters),
    ]);

    if (format === 'excel') {
      const workbook = await buildCashBookWorkbook(entries, summary);
      const buffer = await workbook.xlsx.writeBuffer();
      return {
        buffer,
        filename: `cash-book-${Date.now()}.xlsx`,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
    }

    const buffer = await buildCashBookPdf(entries, summary);
    return {
      buffer,
      filename: `cash-book-${Date.now()}.pdf`,
      contentType: 'application/pdf',
    };
  }
}

export default new CashBookService();
