import assert from 'node:assert/strict';
import test from 'node:test';

import { parseProfileRow, validateDisplayName } from './profile-validation.ts';

const validRow = {
  id: '1c47eee8-c348-40e3-bea9-0fc4d45bfe65',
  display_name: 'Anshuman',
  onboarding_status: 'complete',
  avatar_config: {},
  interests: ['walking'],
  created_at: '2026-08-15T00:00:00.000Z',
  updated_at: '2026-08-15T00:00:00.000Z',
};

test('display-name validation trims acceptable input', () => {
  assert.deepEqual(validateDisplayName('  Anshuman  '), { ok: true, value: 'Anshuman' });
});

test('display-name validation rejects names outside the database boundary', () => {
  assert.equal(validateDisplayName('A').ok, false);
  assert.equal(validateDisplayName('A'.repeat(41)).ok, false);
});

test('display-name validation uses inclusive boundaries after trimming', () => {
  assert.deepEqual(validateDisplayName('  AB  '), { ok: true, value: 'AB' });
  assert.deepEqual(validateDisplayName(` ${'A'.repeat(40)} `), {
    ok: true,
    value: 'A'.repeat(40),
  });
  assert.equal(validateDisplayName('       ').ok, false);
});

test('profile parser maps database snake_case to app camelCase', () => {
  assert.deepEqual(parseProfileRow(validRow), {
    id: validRow.id,
    displayName: 'Anshuman',
    onboardingStatus: 'complete',
    avatarConfig: {},
    interests: ['walking'],
    createdAt: validRow.created_at,
    updatedAt: validRow.updated_at,
  });
});

test('profile parser rejects an unknown onboarding status', () => {
  assert.throws(
    () => parseProfileRow({ ...validRow, onboarding_status: 'unknown' }),
    /invalid onboarding_status/,
  );
});

test('profile parser rejects malformed container fields', () => {
  assert.throws(() => parseProfileRow([]), /not an object/);
  assert.throws(
    () => parseProfileRow({ ...validRow, avatar_config: [] }),
    /invalid avatar_config/,
  );
  assert.throws(
    () => parseProfileRow({ ...validRow, interests: ['walking', 7] }),
    /invalid interests/,
  );
});

test('profile parser rejects a completed profile without a valid name', () => {
  assert.throws(
    () => parseProfileRow({ ...validRow, display_name: null }),
    /completed profile must contain a valid display name/,
  );
});

test('profile parser accepts a new profile that still needs onboarding', () => {
  const profile = parseProfileRow({
    ...validRow,
    display_name: null,
    onboarding_status: 'needs_profile',
  });
  assert.equal(profile.displayName, null);
  assert.equal(profile.onboardingStatus, 'needs_profile');
});

test('profile parser keeps only a valid seed and catalog character ID', () => {
  const profile = parseProfileRow({
    ...validRow,
    avatar_config: {
      version: 1,
      seed: '12345678-abcd-1234-abcd-123456789012',
      avatarId: 'v1-04',
      privateNote: 'must not enter the app profile contract',
    },
  });
  assert.deepEqual(profile.avatarConfig, {
    version: 1,
    seed: '12345678-abcd-1234-abcd-123456789012',
    avatarId: 'v1-04',
  });
});

test('profile parser omits an unknown catalog ID and malformed seed', () => {
  const profile = parseProfileRow({
    ...validRow,
    avatar_config: { version: 1, seed: 'not-a-uuid', avatarId: 'not-in-catalog' },
  });
  assert.deepEqual(profile.avatarConfig, { version: 1 });
});
