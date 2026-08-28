import {
  findCashBookEntries,
  findCashBookEntriesForExport,
  findCashBookEntryById,
  getCashBookPeriodSummary,
  getCategoryBreakdown,
  getPartyBreakdown,
  getOpeningBalanceBefore,
  getLatestCashBalance,
  createCashBookEntry,
  updateCashBookEntryRecord,
  deleteCashBookEntryRecord,
  isInflowType,
  isOutflowType,
  toSqlDate,
  getConnection,
  normalizeCashBookMode,
} from '../repositories/cashBook.repository.js';
import {
  JAMA_CATEGORIES,
  KARCHULU_CATEGORIES,
} from '../helpers/cashBookPeriod.helper.js';
import { ensureNonNegativeBook } from '../helpers/cashBookPost.helper.js';
import { createExpenseRecord } from '../repositories/expense.repository.js';
import { logActivity } from '../repositories/activityLog.repository.js';
import { buildCashBookWorkbook } from '../helpers/exportExcel.helper.js';
import { buildCashBookPdf } from '../helpers/exportPdf.helper.js';
import { AppError } from '../utils/apiResponse.js';

const VALID_METHODS = ['cash', 'upi', 'card', 'bank', 'other'];
const MANUAL_TYPES = ['cash_in', 'cash_out', 'expense', 'transfer'];

const listFilters = (queryParams) => ({
  search: queryParams.search?.trim() || '',
  transactionType: queryParams.transactionType || null,
  bookSide: queryParams.bookSide || null,
  paymentMethod: queryParams.paymentMethod || null,
  period: queryParams.period || null,
  dateFrom: queryParams.dateFrom || null,
  dateTo: queryParams.dateTo || null,
  source: queryParams.source || null,
  category: queryParams.category || null,
});

const resolveManualType = (data) => {
  if (data.bookSide === 'jama') return 'cash_in';
  if (data.bookSide === 'karchulu') return 'expense';
  return data.transactionType;
};

const parseAmount = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new AppError('Amount must be greater than 0', 400);
  }
  return amount;
};

const parseEntryDate = (value) => {
  if (!value) return toSqlDate();
  return toSqlDate(value);
};

const assertManualEntry = (entry) => {
  if (!entry) {
    throw new AppError('Cash book entry not found', 404);
  }
  if (entry.isOpening) {
    throw new AppError('Opening balance can only be changed with Set Opening', 400);
  }
  if (!entry.isManual) {
    throw new AppError(
      entry.source === 'billing'
        ? 'Linked to invoice. Edit the payment from Billing or Pending Payments.'
        : entry.source === 'supplier_payment'
          ? 'Linked to supplier payment. Edit the payment from the supplier record.'
          : 'Automatic cash book entries cannot be edited from the cash book',
      400
    );
  }
};

export class CashBookService {
  async getCashBook(queryParams) {
    const page = Math.max(parseInt(queryParams.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(queryParams.limit, 10) || 15, 1), 100);
    const filters = listFilters(queryParams);

    const [summary, { entries, total }] = await Promise.all([
      getCashBookPeriodSummary(filters),
      findCashBookEntries({ ...filters, page, limit, sortOrder: queryParams.sortOrder || 'desc' }),
    ]);

    return {
      summary,
      entries,
      categories: { jama: JAMA_CATEGORIES, karchulu: KARCHULU_CATEGORIES },
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async getBalance(queryParams) {
    const date = queryParams.date ? toSqlDate(queryParams.date) : toSqlDate();
    const openingBalance = await getOpeningBalanceBefore(date);
    const summary = await getCashBookPeriodSummary({ dateFrom: date, dateTo: date });
    const currentBalance = await getLatestCashBalance();
    return {
      date,
      openingBalance,
      currentBalance,
      ...summary,
    };
  }

  async getDailyReport(queryParams) {
    const date = queryParams.date ? toSqlDate(queryParams.date) : toSqlDate();
    const filters = { dateFrom: date, dateTo: date };
    const [summary, { entries }, breakdown, parties] = await Promise.all([
      getCashBookPeriodSummary(filters),
      findCashBookEntries({ ...filters, page: 1, limit: 10000, sortOrder: 'asc' }),
      getCategoryBreakdown(date, date),
      getPartyBreakdown(date, date),
    ]);

    return {
      date,
      summary,
      breakdown,
      parties,
      entries,
    };
  }

  async getMonthlySummary(queryParams) {
    const now = new Date();
    const year = parseInt(queryParams.year, 10) || now.getFullYear();
    const month = parseInt(queryParams.month, 10) || now.getMonth() + 1;
    const monthStr = String(month).padStart(2, '0');
    const periodStart = `${year}-${monthStr}-01`;
    const lastDayNum = new Date(year, month, 0).getDate();
    const lastDay = `${year}-${monthStr}-${String(lastDayNum).padStart(2, '0')}`;
    const today = toSqlDate();
    const periodEnd = periodStart.slice(0, 7) === today.slice(0, 7) ? today : lastDay;

    const filters = { dateFrom: periodStart, dateTo: periodEnd };
    const [summary, breakdown, parties] = await Promise.all([
      getCashBookPeriodSummary(filters),
      getCategoryBreakdown(periodStart, periodEnd),
      getPartyBreakdown(periodStart, periodEnd),
    ]);

    return {
      year,
      month,
      periodStart,
      periodEnd,
      summary,
      breakdown,
      parties,
    };
  }

  async createEntry(currentUser, data, ipAddress) {
    const transactionType = resolveManualType(data);
    if (!MANUAL_TYPES.includes(transactionType)) {
      throw new AppError('Invalid transaction type for manual entry', 400);
    }
    if (!VALID_METHODS.includes(data.paymentMethod)) {
      throw new AppError('Invalid payment method', 400);
    }

    const category = data.category?.trim();
    if (!category) {
      throw new AppError('Category is required', 400);
    }

    const description = (data.description || data.remarks || '').trim();
    if (description.length < 2) {
      throw new AppError('Description is required', 400);
    }

    const amount = parseAmount(data.amount);
    const transactionDate = parseEntryDate(data.transactionDate);
    const paymentMethod = normalizeCashBookMode(data.paymentMethod) || data.paymentMethod;
    const partyName = data.partyName?.trim() || null;

    const connection = await getConnection();
    try {
      await connection.beginTransaction();

      const entryId = await createCashBookEntry(connection, {
        transactionDate,
        transactionType,
        category,
        description,
        amount,
        paymentMethod,
        referenceType: 'manual',
        referenceId: null,
        referenceNumber: data.referenceNumber?.trim() || null,
        remarks: data.remarks?.trim() || description,
        sortIndex: 1,
        balanceAfter: 0,
        partyName,
        partyType: partyName ? 'other' : null,
        partyId: null,
        source: 'manual',
        createdBy: currentUser.id,
      });

      if (isOutflowType(transactionType)) {
        await createExpenseRecord(connection, {
          expenseDate: transactionDate,
          category,
          amount,
          paymentMethod: paymentMethod === 'other' ? 'cash' : paymentMethod,
          description,
          createdBy: currentUser.id,
        });
      }

      const closing = await ensureNonNegativeBook(connection);
      await connection.commit();

      await logActivity({
        userId: currentUser.id,
        action: 'cashbook_entry_created',
        entityType: 'cash_book',
        entityId: entryId,
        details: { transactionType, bookSide: isInflowType(transactionType) ? 'jama' : 'karchulu', amount },
        ipAddress,
      });

      const entry = await findCashBookEntryById(entryId);
      return { entry, closingBalance: closing };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async updateEntry(currentUser, entryId, data, ipAddress) {
    const existing = await findCashBookEntryById(entryId);
    assertManualEntry(existing);

    const transactionType = resolveManualType({
      bookSide: data.bookSide || existing.bookSide,
      transactionType: data.transactionType || existing.transactionType,
    });
    if (!MANUAL_TYPES.includes(transactionType)) {
      throw new AppError('Invalid transaction type', 400);
    }
    if (data.paymentMethod && !VALID_METHODS.includes(data.paymentMethod)) {
      throw new AppError('Invalid payment method', 400);
    }

    const category = (data.category ?? existing.category)?.trim();
    if (!category) {
      throw new AppError('Category is required', 400);
    }
    const description = (data.description ?? data.remarks ?? existing.description ?? '').trim();
    if (description.length < 2) {
      throw new AppError('Description is required', 400);
    }
    const amount = parseAmount(data.amount ?? existing.amount);
    const transactionDate = parseEntryDate(data.transactionDate ?? existing.transactionDate);

    const connection = await getConnection();
    try {
      await connection.beginTransaction();

      await updateCashBookEntryRecord(connection, entryId, {
        transactionDate,
        transactionType,
        category,
        description,
        amount,
        paymentMethod: normalizeCashBookMode(data.paymentMethod || existing.paymentMethod)
          || data.paymentMethod
          || existing.paymentMethod,
        referenceNumber: data.referenceNumber !== undefined
          ? data.referenceNumber?.trim() || null
          : existing.referenceNumber,
        remarks: data.remarks?.trim() || description,
        sortIndex: existing.sortIndex || 1,
        partyName: data.partyName !== undefined
          ? data.partyName?.trim() || null
          : existing.partyName,
        partyType: existing.partyType,
        partyId: existing.partyId,
        updatedBy: currentUser.id,
      });

      const closing = await ensureNonNegativeBook(connection);
      await connection.commit();

      await logActivity({
        userId: currentUser.id,
        action: 'cashbook_entry_updated',
        entityType: 'cash_book',
        entityId: Number(entryId),
        details: { transactionType, amount },
        ipAddress,
      });

      const entry = await findCashBookEntryById(entryId);
      return { entry, closingBalance: closing };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async deleteEntry(currentUser, entryId, ipAddress) {
    const existing = await findCashBookEntryById(entryId);
    assertManualEntry(existing);

    const connection = await getConnection();
    try {
      await connection.beginTransaction();
      await deleteCashBookEntryRecord(connection, entryId);
      const closing = await ensureNonNegativeBook(connection);
      await connection.commit();

      await logActivity({
        userId: currentUser.id,
        action: 'cashbook_entry_deleted',
        entityType: 'cash_book',
        entityId: Number(entryId),
        details: { transactionType: existing.transactionType, amount: existing.amount },
        ipAddress,
      });

      return { deleted: true, closingBalance: closing };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async setOpeningBalance(currentUser, data, ipAddress) {
    const targetDate = parseEntryDate(data.date || data.transactionDate);
    const desired = Number(data.amount);
    if (!Number.isFinite(desired) || desired < 0) {
      throw new AppError('Opening balance cannot be negative', 400);
    }

    const connection = await getConnection();
    try {
      await connection.beginTransaction();
      const implied = await getOpeningBalanceBefore(targetDate, connection);
      const diff = desired - implied;

      if (Math.abs(diff) < 0.01) {
        await connection.commit();
        return { openingBalance: desired, adjusted: false, closingBalance: desired };
      }

      const paymentMethod = normalizeCashBookMode(data.paymentMethod) || 'cash';
      const entryId = await createCashBookEntry(connection, {
        transactionDate: targetDate,
        transactionType: diff > 0 ? 'cash_in' : 'expense',
        category: 'Opening Balance',
        description: (data.remarks || data.description || 'Opening balance').trim(),
        amount: Math.abs(diff),
        paymentMethod,
        referenceType: 'opening_balance',
        referenceId: null,
        remarks: data.remarks?.trim() || 'Opening balance',
        sortIndex: 0,
        balanceAfter: 0,
        source: 'opening_balance',
        createdBy: currentUser.id,
      });

      const closing = await ensureNonNegativeBook(connection);
      await connection.commit();

      await logActivity({
        userId: currentUser.id,
        action: 'cashbook_opening_set',
        entityType: 'cash_book',
        entityId: entryId,
        details: { date: targetDate, openingBalance: desired, adjustment: diff },
        ipAddress,
      });

      return {
        openingBalance: desired,
        adjusted: true,
        adjustment: diff,
        closingBalance: closing,
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async exportCashBook(queryParams, format) {
    const filters = listFilters(queryParams);
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
