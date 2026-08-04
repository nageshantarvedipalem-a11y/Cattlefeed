import {
  findCustomerLedgerSummaries,
  findLedgerEntries,
  findLedgerEntriesForExport,
  getLedgerPeriodSummary,
  getLatestCustomerBalance,
  createLedgerEntry,
  getConnection,
} from '../repositories/customerLedger.repository.js';
import { findCustomerById } from '../repositories/customer.repository.js';
import { logActivity } from '../repositories/activityLog.repository.js';
import { buildLedgerWorkbook } from '../helpers/exportExcel.helper.js';
import { buildLedgerPdf } from '../helpers/exportPdf.helper.js';
import { AppError } from '../utils/apiResponse.js';

export class LedgerService {
  async listCustomerSummaries(queryParams) {
    const page = Math.max(parseInt(queryParams.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(queryParams.limit, 10) || 10, 1), 100);

    const { summaries, total } = await findCustomerLedgerSummaries({
      search: queryParams.search?.trim() || '',
      village: queryParams.village?.trim() || '',
      page,
      limit,
      sortBy: queryParams.sortBy || 'currentBalance',
      sortOrder: queryParams.sortOrder || 'desc',
    });

    return {
      summaries,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async getCustomerLedger(customerId, queryParams) {
    const customer = await findCustomerById(customerId);
    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    const page = Math.max(parseInt(queryParams.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(queryParams.limit, 10) || 10, 1), 100);

    const summary = await getLedgerPeriodSummary(customerId, {
      period: queryParams.period || null,
      dateFrom: queryParams.dateFrom || null,
      dateTo: queryParams.dateTo || null,
    });

    const { entries, total } = await findLedgerEntries({
      customerId,
      search: queryParams.search?.trim() || '',
      transactionType: queryParams.transactionType || null,
      period: queryParams.period || null,
      dateFrom: queryParams.dateFrom || null,
      dateTo: queryParams.dateTo || null,
      page,
      limit,
      sortOrder: queryParams.sortOrder || 'desc',
    });

    return {
      summary,
      entries,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async listEntries(queryParams) {
    const page = Math.max(parseInt(queryParams.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(queryParams.limit, 10) || 10, 1), 100);

    const { entries, total } = await findLedgerEntries({
      customerId: queryParams.customerId || null,
      search: queryParams.search?.trim() || '',
      transactionType: queryParams.transactionType || null,
      period: queryParams.period || null,
      dateFrom: queryParams.dateFrom || null,
      dateTo: queryParams.dateTo || null,
      page,
      limit,
      sortOrder: queryParams.sortOrder || 'desc',
    });

    return {
      entries,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async createAdjustment(currentUser, data, ipAddress) {
    const customer = await findCustomerById(data.customerId);
    if (!customer) {
      throw new AppError('Customer not found', 404);
    }
    if (!customer.is_active) {
      throw new AppError('Customer is inactive', 400);
    }

    const amount = Number(data.amount);
    if (amount <= 0) {
      throw new AppError('Amount must be greater than 0', 400);
    }

    if (!['debit', 'credit'].includes(data.adjustmentType)) {
      throw new AppError('Adjustment type must be debit or credit', 400);
    }

    const connection = await getConnection();
    try {
      await connection.beginTransaction();

      const previousBalance = await getLatestCustomerBalance(connection, data.customerId);
      let debit = 0;
      let credit = 0;
      let newBalance = previousBalance;

      if (data.adjustmentType === 'debit') {
        debit = amount;
        newBalance = previousBalance + amount;
      } else {
        credit = amount;
        newBalance = previousBalance - amount;
      }

      const entryId = await createLedgerEntry(connection, {
        customerId: data.customerId,
        transactionDate: data.transactionDate ? new Date(data.transactionDate) : new Date(),
        transactionType: 'adjustment',
        referenceType: 'adjustment',
        referenceId: null,
        debit,
        credit,
        balance: newBalance,
        remarks: data.remarks?.trim() || `Manual ${data.adjustmentType} adjustment`,
        createdBy: currentUser.id,
      });

      await connection.commit();

      await logActivity({
        userId: currentUser.id,
        action: 'ledger_adjustment',
        entityType: 'customer_ledger',
        entityId: entryId,
        details: { customerId: data.customerId, adjustmentType: data.adjustmentType, amount },
        ipAddress,
      });

      return {
        entry: {
          id: entryId,
          customerId: data.customerId,
          debit,
          credit,
          balance: newBalance,
        },
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async exportLedger(customerId, queryParams, format) {
    const customer = await findCustomerById(customerId);
    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    const filters = {
      customerId,
      search: queryParams.search?.trim() || '',
      transactionType: queryParams.transactionType || null,
      period: queryParams.period || null,
      dateFrom: queryParams.dateFrom || null,
      dateTo: queryParams.dateTo || null,
    };

    const [entries, summary] = await Promise.all([
      findLedgerEntriesForExport(filters),
      getLedgerPeriodSummary(customerId, filters),
    ]);

    if (format === 'excel') {
      const workbook = await buildLedgerWorkbook(entries, summary);
      const buffer = await workbook.xlsx.writeBuffer();
      return {
        buffer,
        filename: `ledger-${customer.name.replace(/\s+/g, '-')}-${Date.now()}.xlsx`,
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
    }

    const buffer = await buildLedgerPdf(entries, summary);
    return {
      buffer,
      filename: `ledger-${customer.name.replace(/\s+/g, '-')}-${Date.now()}.pdf`,
      contentType: 'application/pdf',
    };
  }
}

export default new LedgerService();
