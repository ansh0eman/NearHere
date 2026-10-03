import test from 'node:test';
import assert from 'node:assert/strict';
import { avatarChoice, avatarIndex, avatarSeed, isAvatarV3Configuration } from './avatar-identity.ts';
test('persisted avatar does not change when the fallback name changes', () => {
  const config = { version: 1, seed: '12345678-abcd-1234-abcd-123456789012' };
  assert.equal(avatarSeed(config, 'Before'), avatarSeed(config, 'After'));
  assert.equal(avatarSeed(config, 'Before'), config.seed);
});
test('legacy, invalid and future configurations have a safe fallback', () => {
  for (const config of [null, {}, [], { version: 2, seed: 'x' }, { version: 1, seed: '<invalid>' }]) {
    assert.equal(avatarSeed(config, 'account-id'), 'account-id');
  }
});
test('same identity always maps to the same stable catalog slot', () => {
  const seed = '12345678-abcd-1234-abcd-123456789012';
  assert.equal(avatarIndex(seed), avatarIndex(seed));
  assert.ok(avatarIndex(seed) >= 0 && avatarIndex(seed) < 6);
  assert.equal(avatarIndex(seed, 0), 0);
});

test('selected catalog character overrides the seed-derived default', () => {
  assert.equal(avatarChoice({ version: 1, seed: '12345678-abcd-1234-abcd-123456789012', avatarId: 'v1-05' }, 'fallback'), 'v1-05');
  assert.match(avatarChoice({ version: 1, seed: '12345678-abcd-1234-abcd-123456789012', avatarId: 'unknown' }, 'fallback'), /^v1-0[1-6]$/);
});

test('a valid v3 appearance remains deterministic while malformed v3 data falls back safely', () => {
  const config = {
    version: 3,
    seed: '12345678-abcd-1234-abcd-123456789012',
    catalogVersion: 1,
    appearanceId: 'kenney-03',
    fallbackAvatarId: 'v1-03',
  };
  assert.equal(isAvatarV3Configuration(config), true);
  assert.equal(avatarSeed(config, 'fallback'), config.seed);
  assert.equal(avatarChoice(config, 'fallback'), 'kenney-03');
  assert.equal(isAvatarV3Configuration({ ...config, appearanceId: 'remote-url' }), false);
  assert.match(avatarChoice({ ...config, appearanceId: 'remote-url' }, 'fallback'), /^v1-0[1-6]$/);
});
