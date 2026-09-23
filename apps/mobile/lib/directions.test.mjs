import assert from 'node:assert/strict';
import test from 'node:test';

import { walkingDirectionsUrl } from './directions.ts';

const point = { latitude: 12.9352, longitude: 77.6245 };

test('walkingDirectionsUrl uses the native Android geo URI', () => {
  assert.equal(walkingDirectionsUrl(point, 'android'), 'geo:12.9352,77.6245?q=12.9352,77.6245');
});

test('walkingDirectionsUrl asks Apple Maps for walking directions on iOS', () => {
  assert.equal(walkingDirectionsUrl(point, 'ios'), 'https://maps.apple.com/?daddr=12.9352,77.6245&dirflg=w');
});
