/** Public onboarding progress. Authentication itself remains owned by Supabase Auth. */
export type OnboardingStatus = 'needs_profile' | 'complete';

/**
 * A future avatar renderer will replace this open object with a versioned schema.
 * It is intentionally empty by default while the custom builder is deferred.
 */
import type { AvatarCatalogId, AvatarConfiguration, KenneyAppearanceId } from './avatar';

export type AvatarConfig = AvatarConfiguration;

/**
 * The authenticated user's application profile. Phone number, OTP data, and
 * session tokens must never be added to this contract. Public discovery will
 * eventually use a smaller, explicitly projected host-summary contract.
 */
export interface UserProfile {
  id: string;
  displayName: string | null;
  /** Optional canonical public handle; never used as an authorization identity. */
  username: string | null;
  onboardingStatus: OnboardingStatus;
  avatarConfig: AvatarConfig;
  interests: string[];
  bio: string | null;
  cityLabel: string | null;
  publicProfileEnabled: boolean;
  profileRevision: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateMyProfileRequest {
  displayName?: string;
  avatarId?: AvatarCatalogId;
  interests?: string[];
  bio?: string | null;
  cityLabel?: string | null;
}

/** First-claim-only username request; ownership is always derived from auth. */
export interface ClaimMyUsernameRequest {
  username: string;
  expectedRevision: number;
}

/** Owner-scoped request for a bounded Avatar Studio appearance. */
export interface SaveMyAvatarV3Request {
  appearanceId: KenneyAppearanceId;
  expectedRevision: number;
}

/** The one command allowed during the minimal onboarding slice. */
export interface CompleteProfileOnboardingRequest {
  displayName: string;
  avatarId?: AvatarCatalogId;
}
