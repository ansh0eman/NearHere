import assert from 'node:assert/strict';
import test from 'node:test';
import { indexHostedDemoSlots } from './demo-activities-utils.mjs';

test('indexes existing hosted fixtures without depending on location or discovery visibility', () => {
  const plans = [
    { id: 'fixture-a', membership_role: 'host', description: 'test [NEARHERE_DEMO_V1:0] row' },
    { id: 'joined-b', membership_role: 'participant', description: '[NEARHERE_DEMO_V1:1]' },
    { id: 'fixture-b', membershipRole: 'host', description: '[NEARHERE_DEMO_V1:1]' },
    { id: 'ordinary', membership_role: 'host', description: 'Not a demo' },
  ];
  assert.deepEqual([...indexHostedDemoSlots(plans, 3)], [[0, 'fixture-a'], [1, 'fixture-b']]);
});

test('ignores malformed, out-of-range and unknown markers', () => {
  assert.equal(indexHostedDemoSlots([
    { id: 'x', membership_role: 'host', description: '[NEARHERE_DEMO_V1:-1] [NEARHERE_DEMO_V1:2] [NEARHERE_DEMO_V1:wat]' },
  ], 2).size, 0);
});

test('fails closed when the owner-scoped plans response may have been truncated', () => {
  assert.throws(() => indexHostedDemoSlots(Array.from({ length: 100 }, () => ({})), 12), /reached its limit/);
});

test('never resolves ambiguous slot ownership by choosing or deleting a row', () => {
  assert.throws(() => indexHostedDemoSlots([
    { id: 'first', membership_role: 'host', description: '[NEARHERE_DEMO_V1:4]' },
    { id: 'second', membership_role: 'host', description: '[NEARHERE_DEMO_V1:4]' },
  ], 12), /More than one hosted activity/);
});

test('keeps an older fixture batch from blocking a fresh labelled batch', () => {
  const plans = [
    { id: 'old', membership_role: 'host', description: '[NEARHERE_DEMO_V1:0]' },
    { id: 'current', membership_role: 'host', description: '[NEARHERE_DEMO_V2:1]' },
  ];
  assert.deepEqual([...indexHostedDemoSlots(plans, 3, 100, 'NEARHERE_DEMO_V2')], [[1, 'current']]);
});
