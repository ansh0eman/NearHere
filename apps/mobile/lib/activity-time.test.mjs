import assert from 'node:assert/strict';
import test from 'node:test';

import { combineLocalDateAndTime, isFutureStart, QUICK_START_OPTIONS, quickStartDate } from './activity-time.ts';

test('separate dialogs combine the chosen local day and clock without mutating either input', () => {
  const day = new Date(2026, 11, 31, 9, 15, 30);
  const clock = new Date(2026, 0, 1, 23, 45, 59);
  const result = combineLocalDateAndTime(day, clock);
  assert.deepEqual([result.getFullYear(), result.getMonth(), result.getDate(), result.getHours(), result.getMinutes(), result.getSeconds()], [2026, 11, 31, 23, 45, 0]);
  assert.equal(day.getHours(), 9);
  assert.equal(clock.getMonth(), 0);
});

test('quickStartDate adds the requested offset and rounds to a minute', () => {
  const now = new Date('2026-09-22T10:00:20.000Z');
  assert.equal(quickStartDate(30, now).toISOString(), '2026-09-22T10:31:00.000Z');
});

test('host time presets have explicit 30-minute, one-hour and 24-hour offsets', () => {
  assert.deepEqual(QUICK_START_OPTIONS.map(({ id, minutes }) => [id, minutes]), [
    ['30m', 30],
    ['1h', 60],
    ['tomorrow', 24 * 60],
  ]);
});

test('one-hour and tomorrow presets round forward without shortening their offset', () => {
  const now = new Date('2026-09-22T10:00:20.000Z');
  assert.equal(quickStartDate(60, now).toISOString(), '2026-09-22T11:01:00.000Z');
  assert.equal(quickStartDate(24 * 60, now).toISOString(), '2026-09-23T10:01:00.000Z');
});

test('isFutureStart rejects a past or equal start time', () => {
  const now = new Date('2026-09-22T10:00:00.000Z');
  assert.equal(isFutureStart(new Date('2026-09-22T10:00:00.000Z'), now), false);
  assert.equal(isFutureStart(new Date('2026-09-22T10:00:01.000Z'), now), true);
});
