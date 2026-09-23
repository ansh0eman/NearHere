import test from 'node:test';
import assert from 'node:assert/strict';
import { avatarSeed } from './avatar-identity.ts';
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
