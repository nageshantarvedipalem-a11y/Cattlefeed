import {
  createCashBookEntry,
  findPostedCashBookByReference,
  recalculateCashBalances,
  normalizeCashBookMode,
} from '../repositories/cashBook.repository.js';
import { AppError } from '../utils/apiResponse.js';

const MODE_LABELS = {
  cash: 'cash',
  upi: 'UPI',
  bank: 'bank',
  other: 'other',
};

export const ensureNonNegativeBook = async (connection) => {
  const result = await recalculateCashBalances(connection);
  const closing = result?.closing ?? result;
  const modes = result?.modes || {};

  if (Number(closing) < -0.01) {
    throw new AppError('This change would make the cash book balance negative', 400);
  }

  for (const [mode, amount] of Object.entries(modes)) {
    if (Number(amount) < -0.01) {
      throw new AppError(`This change would make the ${MODE_LABELS[mode] || mode} balance negative`, 400);
    }
  }

  return closing;
};

export const postCashBookEntry = async (connection, data, { skipRecalc = false, allowNegative = false } = {}) => {
  const paymentMethod = normalizeCashBookMode(data.paymentMethod);
  if (!paymentMethod) {
    return { created: false, skipped: true, reason: 'credit' };
  }

  const amount = Number(data.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { created: false, skipped: true, reason: 'zero' };
  }

  const payload = {
    ...data,
    paymentMethod,
    source: data.source || 'manual',
    status: data.status || 'posted',
    balanceAfter: data.balanceAfter ?? 0,
    modeBalanceAfter: data.modeBalanceAfter ?? 0,
  };

  if (payload.referenceId) {
    const existing = await findPostedCashBookByReference(connection, {
      source: payload.source,
      referenceType: payload.referenceType,
      referenceId: payload.referenceId,
      paymentMethod,
    });
    if (existing) {
      return { created: false, skipped: true, reason: 'duplicate', id: existing.id };
    }
  }

  try {
    const id = await createCashBookEntry(connection, payload);
    if (!skipRecalc) {
      if (allowNegative) {
        await recalculateCashBalances(connection);
      } else {
        await ensureNonNegativeBook(connection);
      }
    }
    return { created: true, id };
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return { created: false, skipped: true, reason: 'duplicate' };
    }
    throw error;
  }
};

export const postCashBookEntries = async (connection, entries, { allowNegative = false } = {}) => {
  const results = [];
  for (const entry of entries) {
    results.push(await postCashBookEntry(connection, entry, { skipRecalc: true, allowNegative }));
  }
  if (results.some((item) => item.created)) {
    if (allowNegative) {
      await recalculateCashBalances(connection);
    } else {
      await ensureNonNegativeBook(connection);
    }
  }
  return results;
};

export const reverseCashBookByReference = async (connection, {
  source,
  referenceType,
  referenceId,
  createdBy,
}) => {
  const [rows] = await connection.execute(
    `SELECT id, transaction_date, transaction_type, category, description, amount, payment_method,
            reference_number, party_name, party_type, party_id, source, remarks, created_by
     FROM cash_book
     WHERE source = ? AND reference_type = ? AND reference_id = ? AND status = 'posted'`,
    [source, referenceType, referenceId]
  );

  const results = [];
  for (const row of rows) {
    const oppositeType = ['cash_in', 'income'].includes(row.transaction_type) ? 'expense' : 'cash_in';
    const posted = await postCashBookEntry(connection, {
      transactionDate: row.transaction_date,
      transactionType: oppositeType,
      category: row.category,
      description: `Reversal of ${row.description || row.remarks || `#${row.id}`}`,
      amount: row.amount,
      paymentMethod: row.payment_method,
      referenceType: 'reversal',
      referenceId: row.id,
      referenceNumber: row.reference_number,
      partyName: row.party_name,
      partyType: row.party_type,
      partyId: row.party_id,
      source: row.source,
      remarks: `Reversal of cash book #${row.id}`,
      createdBy,
    }, { skipRecalc: true, allowNegative: true });

    results.push(posted);
  }

  if (rows.length) {
    await ensureNonNegativeBook(connection);
  }
  return results;
};
