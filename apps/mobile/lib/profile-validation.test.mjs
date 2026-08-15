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
