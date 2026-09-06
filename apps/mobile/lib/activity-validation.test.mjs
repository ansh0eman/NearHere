import assert from 'node:assert/strict';
import test from 'node:test';

import {
  parseActivityDetailRow,
  parseActivitySummaryRow,
  parseCancelActivityResponseRow,
  parseDecideMembershipRequestResponseRow,
  parseJoinActivityResponseRow,
  parseLeaveActivityResponseRow,
  parseMembershipRequestRows,
  parseMyPlanRow,
  parseMyPlanRows,
  parseNearbyActivityRow,
  parseNearbyActivityRows,
} from './activity-validation.ts';

const validRow = {
  id: '22f20b2b-ed44-429f-a2cb-7c92f58b27da',
  kind: 'walk',
  title: 'Evening lake walk',
  description: 'A relaxed loop.',
  status: 'published',
  starts_at: '2026-08-16T12:00:00.000Z',
  ends_at: '2026-08-16T13:00:00.000Z',
  public_latitude: 12.9352,
  public_longitude: 77.6245,
  privacy_radius_m: 350,
  distance_m: 812.4,
  host_display_name: 'Anshuman',
  participant_count: 1,
  capacity: 8,
  join_mode: 'open',
};

test('nearby parser maps a database row into the mobile domain shape', () => {
  const activity = parseNearbyActivityRow(validRow);
  assert.equal(activity.kind, 'walk');
  assert.equal(activity.publicLocation.latitude, 12.9352);
  assert.equal(activity.distanceM, 812.4);
  assert.equal(activity.participantCount, 1);
});

test('activity parser maps every public contract field without leaking private fields', () => {
  const activity = parseNearbyActivityRow({
    ...validRow,
    host_user_id: 'private-host-id',
    private_latitude: 12.931,
    private_longitude: 77.621,
  });

  assert.deepEqual(activity, {
    id: validRow.id,
    kind: 'walk',
    title: 'Evening lake walk',
    description: 'A relaxed loop.',
    status: 'published',
    startsAt: validRow.starts_at,
    endsAt: validRow.ends_at,
    publicLocation: {
      latitude: 12.9352,
      longitude: 77.6245,
      privacyRadiusM: 350,
    },
    hostDisplayName: 'Anshuman',
    participantCount: 1,
    capacity: 8,
    joinMode: 'open',
    distanceM: 812.4,
  });
  assert.equal('host_user_id' in activity, false);
  assert.equal('private_latitude' in activity, false);
  assert.equal('private_longitude' in activity, false);
});

test('creation parser does not require discovery-distance context', () => {
  const { distance_m: _distance, ...creationRow } = validRow;
  const activity = parseActivitySummaryRow(creationRow);
  assert.equal(activity.title, 'Evening lake walk');
  assert.equal('distanceM' in activity, false);
});

test('nearby parser handles an empty discovery result', () => {
  assert.deepEqual(parseNearbyActivityRows([]), []);
});

test('nearby list parser preserves server ordering while mapping each row', () => {
  const secondRow = {
    ...validRow,
    id: '64d823ee-0d7a-4e13-a5a1-8d1774cc876e',
    title: 'Coffee after work',
    distance_m: 940,
  };
  const activities = parseNearbyActivityRows([validRow, secondRow]);

  assert.deepEqual(
    activities.map(({ id, title, distanceM }) => ({ id, title, distanceM })),
    [
      { id: validRow.id, title: validRow.title, distanceM: validRow.distance_m },
      { id: secondRow.id, title: secondRow.title, distanceM: secondRow.distance_m },
    ],
  );
});

test('nearby list parser rejects non-lists and malformed list members', () => {
  assert.throws(() => parseNearbyActivityRows({}), /not a list/);
  assert.throws(() => parseNearbyActivityRows([validRow, null]), /not an object/);
});

test('activity parser accepts all server enum values', () => {
  for (const kind of ['walk', 'coffee', 'sports', 'study', 'coworking', 'creative', 'other']) {
    assert.equal(parseNearbyActivityRow({ ...validRow, kind }).kind, kind);
  }
  for (const status of ['published', 'cancelled', 'completed']) {
    assert.equal(parseNearbyActivityRow({ ...validRow, status }).status, status);
  }
  for (const joinMode of ['open', 'approval']) {
    assert.equal(parseNearbyActivityRow({ ...validRow, join_mode: joinMode }).joinMode, joinMode);
  }
});

test('activity parser rejects unknown enum values', () => {
  assert.throws(() => parseNearbyActivityRow({ ...validRow, kind: 'party' }), /invalid kind/);
  assert.throws(() => parseNearbyActivityRow({ ...validRow, status: 'draft' }), /invalid status/);
  assert.throws(() => parseNearbyActivityRow({ ...validRow, join_mode: 'invite' }), /invalid join_mode/);
});

test('activity parser accepts inclusive public coordinate and privacy boundaries', () => {
  const lower = parseNearbyActivityRow({
    ...validRow,
    public_latitude: -90,
    public_longitude: -180,
    privacy_radius_m: 150,
  });
  const upper = parseNearbyActivityRow({
    ...validRow,
    public_latitude: 90,
    public_longitude: 180,
    privacy_radius_m: 1000,
  });

  assert.deepEqual(lower.publicLocation, {
    latitude: -90,
    longitude: -180,
    privacyRadiusM: 150,
  });
  assert.deepEqual(upper.publicLocation, {
    latitude: 90,
    longitude: 180,
    privacyRadiusM: 1000,
  });
});

test('nearby parser rejects invalid public coordinates', () => {
  assert.throws(
    () => parseNearbyActivityRow({ ...validRow, public_latitude: 91 }),
    /invalid public coordinates/,
  );
  assert.throws(
    () => parseNearbyActivityRow({ ...validRow, public_longitude: -181 }),
    /invalid public coordinates/,
  );
});

test('nearby parser rejects participant counts above capacity', () => {
  assert.throws(
    () => parseNearbyActivityRow({ ...validRow, participant_count: 9 }),
    /invalid participant capacity/,
  );
});

test('activity parser rejects invalid numeric metadata', () => {
  assert.throws(
    () => parseNearbyActivityRow({ ...validRow, participant_count: -1 }),
    /invalid participant capacity/,
  );
  assert.throws(
    () => parseNearbyActivityRow({ ...validRow, participant_count: 1.5 }),
    /invalid participant_count/,
  );
  assert.throws(
    () => parseNearbyActivityRow({ ...validRow, capacity: 1 }),
    /invalid participant capacity/,
  );
  assert.throws(
    () => parseNearbyActivityRow({ ...validRow, privacy_radius_m: 149 }),
    /invalid distance metadata/,
  );
  assert.throws(
    () => parseNearbyActivityRow({ ...validRow, privacy_radius_m: 1001 }),
    /invalid distance metadata/,
  );
  assert.throws(
    () => parseNearbyActivityRow({ ...validRow, distance_m: -0.1 }),
    /invalid distance metadata/,
  );
  assert.throws(
    () => parseNearbyActivityRow({ ...validRow, distance_m: Number.NaN }),
    /invalid distance_m/,
  );
});

test('activity parser requires non-empty identity and display strings', () => {
  assert.throws(() => parseNearbyActivityRow({ ...validRow, id: '' }), /invalid id/);
  assert.throws(() => parseNearbyActivityRow({ ...validRow, title: '' }), /invalid title/);
  assert.throws(
    () => parseNearbyActivityRow({ ...validRow, host_display_name: '' }),
    /invalid host_display_name/,
  );
});

test('activity parser normalizes a missing description to an empty public string', () => {
  assert.equal(parseNearbyActivityRow({ ...validRow, description: null }).description, '');
});

test('detail parser keeps anonymous reads public and accepts every durable membership state', () => {
  const anonymous = parseActivityDetailRow({
    ...validRow,
    exact_latitude: null,
    exact_longitude: null,
    membership_role: null,
    membership_status: null,
  });
  assert.equal(anonymous.membershipRole, null);
  assert.equal(anonymous.exactMeetingLocation, null);

  for (const membershipStatus of ['pending', 'waitlisted', 'rejected', 'left', 'removed']) {
    assert.equal(parseActivityDetailRow({
      ...validRow,
      exact_latitude: null,
      exact_longitude: null,
      membership_role: 'participant',
      membership_status: membershipStatus,
    }).membershipStatus, membershipStatus);
  }
});

test('detail parser releases an exact point only to an active accepted caller', () => {
  const activeRow = {
    ...validRow,
    ends_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    exact_latitude: 12.9279,
    exact_longitude: 77.6717,
    membership_role: 'participant',
    membership_status: 'accepted',
  };
  assert.deepEqual(
    parseActivityDetailRow(activeRow).exactMeetingLocation,
    { latitude: 12.9279, longitude: 77.6717 },
  );
  assert.throws(
    () => parseActivityDetailRow({
      ...activeRow,
      membership_status: 'pending',
    }),
    /exposed exact coordinates/,
  );
  assert.throws(
    () => parseActivityDetailRow({
      ...activeRow,
      exact_latitude: null,
      exact_longitude: null,
    }),
    /invalid exact_latitude/,
  );
});

test('detail parser rejects half-present or invalid host membership', () => {
  assert.throws(
    () => parseActivityDetailRow({
      ...validRow,
      exact_latitude: null,
      exact_longitude: null,
      membership_role: null,
      membership_status: 'pending',
    }),
    /inconsistent membership fields/,
  );
  assert.throws(
    () => parseActivityDetailRow({
      ...validRow,
      exact_latitude: null,
      exact_longitude: null,
      membership_role: 'host',
      membership_status: 'pending',
    }),
    /invalid host membership/,
  );
});

test('nearby parser rejects malformed timestamps', () => {
  assert.throws(
    () => parseNearbyActivityRow({ ...validRow, starts_at: 'tomorrow-ish' }),
    /invalid starts_at/,
  );
});

test('join parser maps accepted, pending, and waitlisted outcomes', () => {
  for (const membershipStatus of ['accepted', 'pending', 'waitlisted']) {
    assert.deepEqual(
      parseJoinActivityResponseRow({
        membership_status: membershipStatus,
        participant_count: 2,
      }),
      { membershipStatus, participantCount: 2 },
    );
  }
});

test('join parser rejects unknown states and invalid counts', () => {
  assert.throws(
    () => parseJoinActivityResponseRow({ membership_status: 'going', participant_count: 2 }),
    /invalid membership_status/,
  );
  assert.throws(
    () => parseJoinActivityResponseRow({ membership_status: 'accepted', participant_count: 0 }),
    /invalid participant_count/,
  );
});

test('leave parser requires the durable left state and promotion flag', () => {
  assert.deepEqual(
    parseLeaveActivityResponseRow({
      membership_status: 'left',
      participant_count: 3,
      waitlist_promoted: true,
    }),
    { membershipStatus: 'left', participantCount: 3, waitlistPromoted: true },
  );
  assert.throws(
    () => parseLeaveActivityResponseRow({
      membership_status: 'left',
      participant_count: 3,
      waitlist_promoted: null,
    }),
    /invalid waitlist_promoted/,
  );
});

test('cancel parser maps the canonical cancellation receipt', () => {
  assert.deepEqual(
    parseCancelActivityResponseRow({
      activity_id: validRow.id,
      cancelled_at: '2026-09-04T08:00:00.000Z',
      status: 'cancelled',
    }),
    {
      activityId: validRow.id,
      cancelledAt: '2026-09-04T08:00:00.000Z',
      status: 'cancelled',
    },
  );
  assert.throws(
    () => parseCancelActivityResponseRow({
      activity_id: validRow.id,
      cancelled_at: 'not-a-time',
      status: 'cancelled',
    }),
    /invalid cancelled_at/,
  );
});

test('host decision parser accepts approval, waitlist, and rejection outcomes', () => {
  for (const membershipStatus of ['accepted', 'waitlisted', 'rejected']) {
    assert.equal(
      parseDecideMembershipRequestResponseRow({
        membership_status: membershipStatus,
        participant_count: 2,
      }).membershipStatus,
      membershipStatus,
    );
  }
  assert.throws(
    () => parseDecideMembershipRequestResponseRow({
      membership_status: 'pending',
      participant_count: 2,
    }),
    /invalid membership_status/,
  );
});

test('pending request parser maps only host-safe request identity fields', () => {
  assert.deepEqual(
    parseMembershipRequestRows([{
      requester_user_id: 'user-2',
      requester_display_name: 'Maya',
      requested_at: '2026-08-16T10:00:00.000Z',
      exact_latitude: 12.9,
    }]),
    [{
      requesterUserId: 'user-2',
      requesterDisplayName: 'Maya',
      requestedAt: '2026-08-16T10:00:00.000Z',
    }],
  );
  assert.throws(() => parseMembershipRequestRows({}), /not a list/);
});

test('plans parser releases exact coordinates only for accepted membership', () => {
  const activePlanRow = {
    ...validRow,
    starts_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    ends_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
  };
  const accepted = parseMyPlanRow({
    ...activePlanRow,
    membership_role: 'participant',
    membership_status: 'accepted',
    exact_latitude: 12.9279,
    exact_longitude: 77.6717,
  });
  const pending = parseMyPlanRow({
    ...activePlanRow,
    membership_role: 'participant',
    membership_status: 'pending',
    exact_latitude: null,
    exact_longitude: null,
  });

  assert.deepEqual(accepted.exactMeetingLocation, { latitude: 12.9279, longitude: 77.6717 });
  assert.equal(pending.exactMeetingLocation, null);
  assert.deepEqual(parseMyPlanRows([]), []);
});

test('plans parser rejects premature or missing private location data', () => {
  const activePlanRow = {
    ...validRow,
    starts_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    ends_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
  };
  assert.throws(
    () => parseMyPlanRow({
      ...activePlanRow,
      membership_role: 'participant',
      membership_status: 'pending',
      exact_latitude: 12.9279,
      exact_longitude: 77.6717,
    }),
    /exposed exact coordinates/,
  );
  assert.throws(
    () => parseMyPlanRow({
      ...activePlanRow,
      membership_role: 'participant',
      membership_status: 'accepted',
      exact_latitude: null,
      exact_longitude: null,
    }),
    /invalid exact_latitude/,
  );
  assert.throws(
    () => parseMyPlanRow({
      ...activePlanRow,
      membership_role: 'host',
      membership_status: 'pending',
      exact_latitude: null,
      exact_longitude: null,
    }),
    /invalid host membership/,
  );
});

test('plans parser removes exact coordinates from ended accepted plans', () => {
  const endedPlan = parseMyPlanRow({
    ...validRow,
    ends_at: new Date(Date.now() - 60 * 1000).toISOString(),
    membership_role: 'participant',
    membership_status: 'accepted',
    exact_latitude: null,
    exact_longitude: null,
  });
  assert.equal(endedPlan.exactMeetingLocation, null);

  assert.throws(
    () => parseMyPlanRow({
      ...validRow,
      ends_at: new Date(Date.now() - 60 * 1000).toISOString(),
      membership_role: 'participant',
      membership_status: 'accepted',
      exact_latitude: 12.9279,
      exact_longitude: 77.6717,
    }),
    /exposed exact coordinates/,
  );
});
