import assert from 'node:assert/strict';
import test from 'node:test';

import {
  parseActivitySummaryRow,
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

test('creation parser does not require discovery-distance context', () => {
  const { distance_m: _distance, ...creationRow } = validRow;
  const activity = parseActivitySummaryRow(creationRow);
  assert.equal(activity.title, 'Evening lake walk');
  assert.equal('distanceM' in activity, false);
});

test('nearby parser handles an empty discovery result', () => {
  assert.deepEqual(parseNearbyActivityRows([]), []);
});

test('nearby parser rejects invalid public coordinates', () => {
  assert.throws(
    () => parseNearbyActivityRow({ ...validRow, public_latitude: 91 }),
    /invalid public coordinates/,
  );
});

test('nearby parser rejects participant counts above capacity', () => {
  assert.throws(
    () => parseNearbyActivityRow({ ...validRow, participant_count: 9 }),
    /invalid participant capacity/,
  );
});

test('nearby parser rejects malformed timestamps', () => {
  assert.throws(
    () => parseNearbyActivityRow({ ...validRow, starts_at: 'tomorrow-ish' }),
    /invalid starts_at/,
  );
});
