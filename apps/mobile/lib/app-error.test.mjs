import test from 'node:test';
import assert from 'node:assert/strict';

import { appFailure } from './app-error.ts';

test('appFailure exposes safe stable failure metadata', () => {
  const result = appFailure('rate_limited', 'Try again shortly.', true, 'join-abc');
  assert.deepEqual(result, {
    ok: false,
    message: 'Try again shortly.',
    error: {
      code: 'rate_limited',
      message: 'Try again shortly.',
      requestId: 'join-abc',
      retryable: true,
    },
  });
});

test('appFailure supports a non-retryable permission failure', () => {
  const result = appFailure('forbidden', 'Sign in to report an activity.', false, 'report-abc');
  assert.equal(result.error.code, 'forbidden');
  assert.equal(result.error.retryable, false);
  assert.equal(result.message, 'Sign in to report an activity.');
});
