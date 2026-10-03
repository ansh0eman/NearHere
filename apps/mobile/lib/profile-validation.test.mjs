import assert from 'node:assert/strict';
import test from 'node:test';

import { parseProfileRow, validateDisplayName, validateProfileDetails, validateUsername } from './profile-validation.ts';

const validRow = {
  id: '1c47eee8-c348-40e3-bea9-0fc4d45bfe65',
  display_name: 'Anshuman',
  username: null,
  onboarding_status: 'complete',
  avatar_config: {},
  interests: ['walking'],
  bio: null,
  city_label: null,
  public_profile_enabled: false,
  profile_revision: 0,
  created_at: '2026-08-15T00:00:00.000Z',
  updated_at: '2026-08-15T00:00:00.000Z',
};

test('display-name validation trims acceptable input', () => {
  assert.deepEqual(validateDisplayName('  Anshuman  '), { ok: true, value: 'Anshuman' });
});

test('username validation canonicalizes and enforces reserved-name and ASCII rules', () => {
  assert.deepEqual(validateUsername('  Ansh_42  '), { ok: true, value: 'ansh_42' });
  for (const invalid of ['', 'ab', '1starts', 'has space', 'contains-hyphen', 'éclair', 'a'.repeat(21), 'admin', 'support']) {
    assert.equal(validateUsername(invalid).ok, false, `Expected invalid username: ${invalid}`);
  }
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
    username: null,
    onboardingStatus: 'complete',
    avatarConfig: {},
    interests: ['walking'],
    bio: null,
    cityLabel: null,
    publicProfileEnabled: false,
    profileRevision: 0,
    createdAt: validRow.created_at,
    updatedAt: validRow.updated_at,
  });
});

test('profile parser accepts canonical handles and keeps pre-migration rows compatible', () => {
  assert.equal(parseProfileRow({ ...validRow, username: 'ansh_42' }).username, 'ansh_42');
  assert.equal(parseProfileRow({ ...validRow, username: undefined }).username, null);
  assert.throws(() => parseProfileRow({ ...validRow, username: 'Ansh_42' }), /invalid username/);
  assert.throws(() => parseProfileRow({ ...validRow, username: 'Admin' }), /invalid username/);
});

test('Unicode limits match database code points, not UTF-16 units', () => {
  assert.equal(validateDisplayName('😀').ok, false);
  assert.equal(validateDisplayName('😀'.repeat(40)).ok, true);
  assert.equal(validateProfileDetails('😀'.repeat(160), ' Bengaluru ').ok, true);
  assert.equal(validateProfileDetails('😀'.repeat(161), '').ok, false);
  assert.deepEqual(validateProfileDetails('  ', '  '), { ok: true, bio: null, cityLabel: null });
  assert.throws(() => parseProfileRow({ ...validRow, profile_revision: -1 }), /invalid owner/);
  assert.throws(() => parseProfileRow({ ...validRow, public_profile_enabled: 'false' }), /invalid owner/);
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

test('profile parser admits only the bounded v3 appearance projection', () => {
  const config = {
    version: 3,
    seed: '12345678-abcd-1234-abcd-123456789012',
    catalogVersion: 1,
    appearanceId: 'kenney-02',
    fallbackAvatarId: 'v1-02',
    privatePath: 'not exposed',
  };
  assert.deepEqual(parseProfileRow({ ...validRow, avatar_config: config }).avatarConfig, {
    version: 3,
    seed: config.seed,
    catalogVersion: 1,
    appearanceId: 'kenney-02',
    fallbackAvatarId: 'v1-02',
  });
  assert.deepEqual(parseProfileRow({ ...validRow, avatar_config: { ...config, appearanceId: 'anything' } }).avatarConfig, {});
});
