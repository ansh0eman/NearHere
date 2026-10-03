import assert from 'node:assert/strict';
import test from 'node:test';
import { locationFailureMessage, resolveDeviceLocation } from './device-location.ts';

const point = { coords: { latitude: 12.9, longitude: 77.6 } };
const provider = (overrides = {}) => ({ servicesEnabled: async () => true, permissionGranted: async () => true,
  current: async () => point, recent: async () => null, ...overrides });
test('device fix and cached fix have distinct freshness', async () => {
  assert.deepEqual(await resolveDeviceLocation(provider()), { ok: true, point, cached: false });
  assert.deepEqual(await resolveDeviceLocation(provider({ current: async () => { throw Error(); }, recent: async () => point })), { ok: true, point, cached: true });
});
test('disabled services do not request permission', async () => {
  assert.deepEqual(await resolveDeviceLocation(provider({ servicesEnabled: async () => false, permissionGranted: async () => assert.fail() })), { ok: false, reason: 'servicesDisabled' });
});
test('denied permission does not request coordinates', async () => {
  assert.deepEqual(await resolveDeviceLocation(provider({ permissionGranted: async () => false, current: async () => assert.fail() })), { ok: false, reason: 'permissionDenied' });
});
test('a missing simulator GPS fix times out without hanging', async () => {
  assert.deepEqual(await resolveDeviceLocation(provider({ current: () => new Promise(() => {}) }), 5), { ok: false, reason: 'fixUnavailable' });
});
test('cache failure also produces a recoverable unavailable state', async () => {
  assert.deepEqual(await resolveDeviceLocation(provider({ current: async () => { throw Error(); }, recent: async () => { throw Error(); } })), { ok: false, reason: 'fixUnavailable' });
});
test('location failures tell users which setting or manual fallback applies', () => {
  assert.match(locationFailureMessage('servicesDisabled'), /Location Services are off/);
  assert.match(locationFailureMessage('servicesDisabled'), /in Settings/);
  assert.match(locationFailureMessage('permissionDenied'), /location permission/);
  for (const reason of ['servicesDisabled', 'permissionDenied', 'fixUnavailable']) {
    assert.match(locationFailureMessage(reason), /choose an area/i);
  }
  assert.match(locationFailureMessage('fixUnavailable'), /selected area is unchanged/);
});
