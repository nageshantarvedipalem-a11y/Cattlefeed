import assert from 'node:assert/strict';
import {
  resolvePeriodRange,
  computeClosing,
  bookSideOf,
  addDays,
  toSqlDate,
  normalizeCashBookMode,
  emptyModeBalances,
  applyModeDelta,
  sourceLabel,
  CASH_BOOK_MODES,
} from '../src/helpers/cashBookPeriod.helper.js';

const now = new Date('2026-08-28T10:00:00');

const today = resolvePeriodRange('daily', null, null, now);
assert.equal(today.periodStart, '2026-08-28');
assert.equal(today.periodEnd, '2026-08-28');

const yesterday = resolvePeriodRange('yesterday', null, null, now);
assert.equal(yesterday.periodStart, '2026-08-27');
assert.equal(yesterday.periodEnd, '2026-08-27');

const week = resolvePeriodRange('weekly', null, null, now);
assert.equal(week.periodStart, '2026-08-24');
assert.equal(week.periodEnd, '2026-08-28');

const month = resolvePeriodRange('monthly', null, null, now);
assert.equal(month.periodStart, '2026-08-01');
assert.equal(month.periodEnd, '2026-08-28');

const lastMonth = resolvePeriodRange('last_month', null, null, now);
assert.equal(lastMonth.periodStart, '2026-07-01');
assert.equal(lastMonth.periodEnd, '2026-07-31');

assert.equal(computeClosing(50000, 35000, 14000), 71000);
assert.equal(bookSideOf('income'), 'jama');
assert.equal(bookSideOf('expense'), 'karchulu');
assert.equal(addDays('2026-08-28', -1), '2026-08-27');
assert.equal(toSqlDate('2026-08-28T12:00:00.000Z').startsWith('2026-08-'), true);

assert.equal(normalizeCashBookMode('credit'), null);
assert.equal(normalizeCashBookMode('card'), 'other');
assert.equal(normalizeCashBookMode('upi'), 'upi');
assert.equal(sourceLabel('billing'), 'BILLING');
assert.equal(sourceLabel('supplier_payment'), 'SUPPLIER_PAYMENT');
assert.equal(sourceLabel('manual'), 'MANUAL');
assert.equal(sourceLabel('opening_balance'), 'OTHER');

let modes = emptyModeBalances();
modes = applyModeDelta(modes, 'cash', 20000);
modes = applyModeDelta(modes, 'upi', 15000);
modes = applyModeDelta(modes, 'bank', -10000);
assert.equal(modes.cash, 20000);
assert.equal(modes.upi, 15000);
assert.equal(modes.bank, -10000);
assert.equal(CASH_BOOK_MODES.reduce((sum, mode) => sum + modes[mode], 0), 25000);

const opening = 50000;
const jama = 35000;
const karchulu = 14000;
assert.equal(computeClosing(opening, jama, karchulu), opening + jama - karchulu);

console.log('cash book period helper tests passed');
