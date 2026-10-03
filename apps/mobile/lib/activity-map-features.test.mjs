import assert from 'node:assert/strict';
import test from 'node:test';

import { buildActivityMapFeatures, cameraBottomPadding, cameraMotionDuration, formatMapDistance, resolveSelectedActivity, shouldShowSelectedMapLabel } from './activity-map-features.ts';

const sample = (overrides = {}) => ({
  id: 'nearhere-map-a',
  kind: 'walk',
  title: 'Walk',
  description: '',
  status: 'published',
  startsAt: '2026-09-25T10:00:00Z',
  endsAt: '2026-09-25T11:00:00Z',
  publicLocation: { latitude: 12.9283, longitude: 77.6739, privacyRadiusM: 350 },
  hostDisplayName: 'Demo host',
  participantCount: 1,
  capacity: 6,
  joinMode: 'open',
  distanceM: 400,
  hostAvatarConfig: null,
  ...overrides,
});

test('map feature builder converts Bengaluru latitude-longitude to GeoJSON longitude-latitude', () => {
  const { features } = buildActivityMapFeatures([sample()]);
  assert.deepEqual(features[0].geometry.coordinates, [77.6739, 12.9283]);
  assert.equal(features[0].id, 'nearhere-map-a');
});

test('map feature builder omits invalid coordinates and duplicate IDs without moving points', () => {
  const { features } = buildActivityMapFeatures([
    sample(),
    sample({ publicLocation: { latitude: 90.1, longitude: 20, privacyRadiusM: 350 } }),
    sample({ publicLocation: { latitude: 10, longitude: Number.NaN, privacyRadiusM: 350 } }),
  ]);
  assert.equal(features.length, 1);
});

test('map feature builder safely returns empty GeoJSON and deterministic catalog fallback', () => {
  assert.deepEqual(buildActivityMapFeatures([]), { type: 'FeatureCollection', features: [] });
  const first = buildActivityMapFeatures([sample()]).features[0].properties.avatarIcon;
  const second = buildActivityMapFeatures([sample()]).features[0].properties.avatarIcon;
  assert.equal(first, second);
  assert.match(first, /^avatar-v1-0[1-6]$/);
});

test('map labels use safe activity categories and compact approximate distance only', () => {
  const feature = buildActivityMapFeatures([sample({ title: 'Private text should not be on map', distanceM: 446 })]).features[0];
  assert.equal(feature.properties.mapLabel, 'Walk · 450 m');
  assert.equal(JSON.stringify(feature.properties).includes('Private text'), false);
  assert.equal(buildActivityMapFeatures([sample({ kind: 'coffee', distanceM: 1_230 })]).features[0].properties.mapLabel, 'Coffee · 1.2 km');
  assert.equal(formatMapDistance(0), '0 m');
  assert.equal(formatMapDistance(Number.NaN), 'Nearby');
  assert.equal(formatMapDistance(-20), 'Nearby');
});

test('selected map label yields when another public avatar point is nearby', () => {
  const selected = sample();
  const close = sample({ id: 'nearby-avatar', publicLocation: { latitude: 12.929, longitude: 77.6739, privacyRadiusM: 350 } });
  const far = sample({ id: 'far-avatar', publicLocation: { latitude: 12.94, longitude: 77.6739, privacyRadiusM: 350 } });
  assert.equal(shouldShowSelectedMapLabel(buildActivityMapFeatures([selected]), selected.id), true);
  assert.equal(shouldShowSelectedMapLabel(buildActivityMapFeatures([selected, close]), selected.id), false);
  assert.equal(shouldShowSelectedMapLabel(buildActivityMapFeatures([selected, far]), selected.id), true);
  assert.equal(shouldShowSelectedMapLabel(buildActivityMapFeatures([selected]), null), false);
});

test('renderer rejects records containing private exact-location fields', () => {
  const { features } = buildActivityMapFeatures([
    sample({ exactMeetingLocation: { latitude: 12.9, longitude: 77.6 } }),
    sample({ id: 'sql-shaped', exact_latitude: 12.9 }),
    sample({ id: 'private-shaped', private_latitude: 12.9 }),
  ]);
  assert.deepEqual(features, []);
});

test('selection resolves to null when a filter removes its activity', () => {
  const chosen = sample();
  assert.equal(resolveSelectedActivity([chosen], chosen.id), chosen);
  assert.equal(resolveSelectedActivity([], chosen.id), null);
  assert.equal(resolveSelectedActivity([chosen], null), null);
});

test('camera bottom padding follows the overlay while staying within a readable viewport', () => {
  assert.equal(cameraBottomPadding(260, 800), 260);
  assert.equal(cameraBottomPadding(700, 800), 440);
  assert.equal(cameraBottomPadding(-10, 800), 0);
  assert.equal(cameraBottomPadding(200, 0), 0);
  assert.equal(cameraBottomPadding(Number.NaN, 800), 0);
});

test('camera motion is immediate for Reduce Motion and bounded for ordinary transitions', () => {
  assert.equal(cameraMotionDuration(350, true), 0);
  assert.equal(cameraMotionDuration(350, false), 350);
  assert.equal(cameraMotionDuration(5_000, false), 1_200);
  assert.equal(cameraMotionDuration(-20, false), 0);
  assert.equal(cameraMotionDuration(Number.NaN, false), 0);
});
