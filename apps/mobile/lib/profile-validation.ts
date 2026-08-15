import type { UserProfile } from '@/types/profile';

const DISPLAY_NAME_MIN_LENGTH = 2;
const DISPLAY_NAME_MAX_LENGTH = 40;

type ValidationResult =
  | { ok: true; value: string }
  | { ok: false; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Profile response has an invalid ${key}.`);
  }
  return value;
}

export function validateDisplayName(value: string): ValidationResult {
  const normalized = value.trim();
  if (normalized.length < DISPLAY_NAME_MIN_LENGTH || normalized.length > DISPLAY_NAME_MAX_LENGTH) {
    return {
      ok: false,
      message: `Use between ${DISPLAY_NAME_MIN_LENGTH} and ${DISPLAY_NAME_MAX_LENGTH} characters.`,
    };
  }
  return { ok: true, value: normalized };
}

export function parseProfileRow(value: unknown): UserProfile {
  if (!isRecord(value)) throw new Error('Profile response is not an object.');

  const displayNameValue = value.display_name;
  if (displayNameValue !== null && typeof displayNameValue !== 'string') {
    throw new Error('Profile response has an invalid display_name.');
  }

  const onboardingStatus = value.onboarding_status;
  if (onboardingStatus !== 'needs_profile' && onboardingStatus !== 'complete') {
    throw new Error('Profile response has an invalid onboarding_status.');
  }
  if (onboardingStatus === 'complete' && !validateDisplayName(displayNameValue ?? '').ok) {
    throw new Error('A completed profile must contain a valid display name.');
  }

  if (!isRecord(value.avatar_config)) {
    throw new Error('Profile response has an invalid avatar_config.');
  }
  if (!Array.isArray(value.interests) || !value.interests.every((interest) => typeof interest === 'string')) {
    throw new Error('Profile response has invalid interests.');
  }

  return {
    id: requireString(value, 'id'),
    displayName: displayNameValue,
    onboardingStatus,
    avatarConfig: value.avatar_config,
    interests: value.interests,
    createdAt: requireString(value, 'created_at'),
    updatedAt: requireString(value, 'updated_at'),
  };
}
