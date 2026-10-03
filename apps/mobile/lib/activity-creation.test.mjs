import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveActivityPublishAttempt } from './activity-creation.ts';

test('the same activity draft reuses its publish request ID after an uncertain response', () => {
  let sequence = 0;
  const createRequestId = () => `publish-${++sequence}`;
  const first = resolveActivityPublishAttempt(null, '{"title":"Coffee"}', createRequestId);
  const retry = resolveActivityPublishAttempt(first, '{"title":"Coffee"}', createRequestId);
  assert.equal(first.requestId, 'publish-1');
  assert.equal(retry.requestId, 'publish-1');
});

test('changing the activity draft creates a new publish request ID', () => {
  let sequence = 0;
  const createRequestId = () => `publish-${++sequence}`;
  const first = resolveActivityPublishAttempt(null, '{"title":"Coffee"}', createRequestId);
  const changed = resolveActivityPublishAttempt(first, '{"title":"Walk"}', createRequestId);
  assert.equal(changed.requestId, 'publish-2');
});
