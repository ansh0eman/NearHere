import assert from 'node:assert/strict';
import test from 'node:test';

import { parseSafetyReviewReceipt } from './safety-validation.ts';

test('safety review receipt accepts an audited reopen transition', () => {
  assert.deepEqual(parseSafetyReviewReceipt({
    report_id: 'report-1',
    status: 'open',
    reviewed_at: '2026-09-21T10:00:00.000Z',
  }), {
    reportId: 'report-1',
    status: 'open',
    reviewedAt: '2026-09-21T10:00:00.000Z',
  });
});
