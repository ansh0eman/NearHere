import type { UserProfile } from '@/types/profile';
import { isAvatarCatalogId, isAvatarSeed, isAvatarV3Configuration } from './avatar-identity.ts';

const DISPLAY_NAME_MIN_LENGTH = 2;
const DISPLAY_NAME_MAX_LENGTH = 40;
const USERNAME_RESERVED = new Set(['admin', 'administrator', 'help', 'moderator', 'nearhere', 'official', 'root', 'staff', 'support', 'system']);

export const PROFILE_INTERESTS = ['walk', 'coffee', 'sports', 'study', 'coworking', 'creative', 'other'] as const;
export const characterCount = (value: string) => Array.from(value).length;

export function validateProfileDetails(bio: string, city: string):
  { ok: true; bio: string | null; cityLabel: string | null } | { ok: false; message: string } {
  if (characterCount(bio.trim()) > 160) return { ok: false, message: 'Keep your bio within 160 characters.' };
  if (characterCount(city.trim()) > 80) return { ok: false, message: 'Keep your city within 80 characters.' };
  return { ok: true, bio: bio.trim() || null, cityLabel: city.trim() || null };
}

type ValidationResult =
  | { ok: true; value: string }
  | { ok: false; message: string };

export type UsernameValidationResult =
  | { ok: true; value: string }
  | { ok: false; message: string };

/** Normalize a proposed handle the same way the database claim command does. */
export function validateUsername(value: string): UsernameValidationResult {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-z][a-z0-9_]{2,19}$/.test(normalized)) {
    return { ok: false, message: 'Use 3–20 characters, starting with a letter; use letters, numbers, or underscore.' };
  }
  if (USERNAME_RESERVED.has(normalized)) {
    return { ok: false, message: 'That username is reserved.' };
  }
  return { ok: true, value: normalized };
}

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
  if (characterCount(normalized) < DISPLAY_NAME_MIN_LENGTH || characterCount(normalized) > DISPLAY_NAME_MAX_LENGTH) {
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
  // During an additive migration rollout, an old update RPC may return the
  // prior composite-row shape. Treat only an omitted field as a legacy null.
  const usernameValue = value.username === undefined ? null : value.username;
  if (typeof usernameValue === 'string') {
    const usernameValidation = validateUsername(usernameValue);
    if (!usernameValidation.ok || usernameValidation.value !== usernameValue) {
      throw new Error('Profile response has an invalid username.');
    }
  } else if (usernameValue !== null) {
    throw new Error('Profile response has an invalid username.');
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

  const avatarConfig = value.avatar_config;
  const details = validateProfileDetails(typeof value.bio === 'string' ? value.bio : '', typeof value.city_label === 'string' ? value.city_label : '');
  if (!details.ok || (value.bio !== null && typeof value.bio !== 'string')
      || (value.city_label !== null && typeof value.city_label !== 'string')
      || typeof value.public_profile_enabled !== 'boolean'
      || !Number.isSafeInteger(value.profile_revision) || (value.profile_revision as number) < 0) {
    throw new Error('Profile response has invalid owner details or revision.');
  }
  const hasValidSeed = isAvatarSeed(avatarConfig.seed);
  const safeAvatarConfig = isAvatarV3Configuration(avatarConfig)
    ? {
      version: 3 as const,
      seed: avatarConfig.seed,
      catalogVersion: 1 as const,
      appearanceId: avatarConfig.appearanceId,
      fallbackAvatarId: avatarConfig.fallbackAvatarId,
    }
    : avatarConfig.version === 1
    ? {
      version: 1 as const,
      ...(hasValidSeed ? { seed: avatarConfig.seed as string } : {}),
      ...(isAvatarCatalogId(avatarConfig.avatarId) ? { avatarId: avatarConfig.avatarId } : {}),
    }
    : {};

  return {
    id: requireString(value, 'id'),
    displayName: displayNameValue,
    username: usernameValue,
    onboardingStatus,
    avatarConfig: safeAvatarConfig,
    interests: value.interests,
    bio: details.bio,
    cityLabel: details.cityLabel,
    publicProfileEnabled: value.public_profile_enabled,
    profileRevision: value.profile_revision as number,
    createdAt: requireString(value, 'created_at'),
    updatedAt: requireString(value, 'updated_at'),
  };
}
