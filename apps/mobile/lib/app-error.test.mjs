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
