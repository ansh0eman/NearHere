import assert from 'node:assert/strict';
import test from 'node:test';

import { appendActivityMessage } from './activity-message-utils.ts';

const message = (id, createdAt) => ({
  id,
  activityId: 'activity-1',
  authorUserId: 'user-1',
  authorDisplayName: 'Test user',
  body: id,
  createdAt,
});

test('appendActivityMessage deduplicates a send racing a history refresh', () => {
  const existing = message('message-1', '2026-09-21T10:00:00.000Z');
  assert.deepEqual(appendActivityMessage([existing], existing), [existing]);
});

test('appendActivityMessage preserves server chronological and ID ordering', () => {
  const later = message('message-b', '2026-09-21T10:01:00.000Z');
  const earlier = message('message-a', '2026-09-21T10:00:00.000Z');
  const sameTimeHigherId = message('message-c', '2026-09-21T10:01:00.000Z');
  assert.deepEqual(
    appendActivityMessage([later, sameTimeHigherId], earlier),
    [earlier, later, sameTimeHigherId],
  );
});
