import assert from 'node:assert/strict';
import test from 'node:test';

import { partitionPlans } from './plan-utils.ts';

const plan = (id, startsAt, endsAt, status = 'published') => ({
  id,
  kind: 'walk',
  title: id,
  description: '',
  status,
  startsAt,
  endsAt,
  publicLocation: { latitude: 12.9, longitude: 77.6, privacyRadiusM: 350 },
  hostDisplayName: 'Host',
  participantCount: 1,
  capacity: 2,
  joinMode: 'open',
  membershipRole: 'participant',
  membershipStatus: 'accepted',
  exactMeetingLocation: null,
});

test('partitionPlans keeps active plans ordered next-first and inactive plans in recent history', () => {
  const now = Date.parse('2026-09-21T10:00:00.000Z');
  const result = partitionPlans([
    plan('later', '2026-09-22T14:00:00.000Z', '2026-09-22T15:00:00.000Z'),
    plan('cancelled', '2026-09-23T14:00:00.000Z', '2026-09-23T15:00:00.000Z', 'cancelled'),
    plan('ended', '2026-09-20T14:00:00.000Z', '2026-09-20T15:00:00.000Z'),
    plan('next', '2026-09-21T11:00:00.000Z', '2026-09-21T12:00:00.000Z'),
  ], now);
  assert.deepEqual(result.upcoming.map((item) => item.id), ['next', 'later']);
  assert.deepEqual(result.history.map((item) => item.id), ['cancelled', 'ended']);
});
