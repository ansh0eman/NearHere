import assert from 'node:assert/strict';
import test from 'node:test';

import { parseGooglePlaceSearchResponse } from './place-search-contract.ts';

test('Google place-search adapter accepts only the public-safe result contract', () => {
  assert.deepEqual(parseGooglePlaceSearchResponse({
    results: [
      { id: 'place-1', label: 'Cubbon Park, Bengaluru', latitude: 12.9763, longitude: 77.5929 },
      { id: 'bad-coordinate', label: 'Bad', latitude: 120, longitude: 77 },
      { id: 'bad-label', label: '', latitude: 12, longitude: 77 },
    ],
  }), [{ id: 'place-1', label: 'Cubbon Park, Bengaluru', latitude: 12.9763, longitude: 77.5929 }]);
});

test('Google place-search adapter fails closed for malformed Edge Function payloads', () => {
  assert.deepEqual(parseGooglePlaceSearchResponse(null), []);
  assert.deepEqual(parseGooglePlaceSearchResponse({ results: {} }), []);
  assert.deepEqual(parseGooglePlaceSearchResponse({ results: [{ id: 7, label: 'Park', latitude: 12, longitude: 77 }] }), []);
});
