import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveChatConnectionTransition } from './chat-connection.ts';

test('chat starts polling whenever a new disconnect has no active polling timer', () => {
  assert.deepEqual(resolveChatConnectionTransition('CHANNEL_ERROR', false), {
    connection: 'polling', startPolling: true, stopPolling: false,
  });
  assert.deepEqual(resolveChatConnectionTransition('TIMED_OUT', true), {
    connection: 'polling', startPolling: false, stopPolling: false,
  });
});

test('chat clears the timer on recovery so a later disconnect starts polling again', () => {
  const firstFailure = resolveChatConnectionTransition('CHANNEL_ERROR', false);
  assert.equal(firstFailure.startPolling, true);

  const recovery = resolveChatConnectionTransition('SUBSCRIBED', true);
  assert.deepEqual(recovery, { connection: 'live', startPolling: false, stopPolling: true });

  const secondFailure = resolveChatConnectionTransition('CLOSED', false);
  assert.deepEqual(secondFailure, { connection: 'polling', startPolling: true, stopPolling: false });
});

test('chat uses polling as the safe baseline when realtime is unavailable', () => {
  assert.deepEqual(resolveChatConnectionTransition('unavailable', false), {
    connection: 'polling', startPolling: true, stopPolling: false,
  });
});
