import assert from 'node:assert/strict';
import test from 'node:test';

import { isFutureStart, quickStartDate } from './activity-time.ts';

test('quickStartDate adds the requested offset and rounds to a minute', () => {
  const now = new Date('2026-09-22T10:00:20.000Z');
  assert.equal(quickStartDate(30, now).toISOString(), '2026-09-22T10:31:00.000Z');
});

test('isFutureStart rejects a past or equal start time', () => {
  const now = new Date('2026-09-22T10:00:00.000Z');
  assert.equal(isFutureStart(new Date('2026-09-22T10:00:00.000Z'), now), false);
  assert.equal(isFutureStart(new Date('2026-09-22T10:00:01.000Z'), now), true);
});
