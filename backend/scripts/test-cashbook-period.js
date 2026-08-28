import assert from 'node:assert/strict';
import {
  resolvePeriodRange,
  computeClosing,
  bookSideOf,
  addDays,
  toSqlDate,
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

assert.equal(computeClosing(10000, 5000, 3000), 12000);
assert.equal(bookSideOf('income'), 'jama');
assert.equal(bookSideOf('expense'), 'karchulu');
assert.equal(addDays('2026-08-28', -1), '2026-08-27');
assert.equal(toSqlDate('2026-08-28T12:00:00.000Z').startsWith('2026-08-'), true);

console.log('cash book period helper tests passed');
