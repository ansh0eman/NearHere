/** Public onboarding progress. Authentication itself remains owned by Supabase Auth. */
export type OnboardingStatus = 'needs_profile' | 'complete';

/**
 * A future avatar renderer will replace this open object with a versioned schema.
 * It is intentionally empty by default while the custom builder is deferred.
 */
export type AvatarConfig = Record<string, unknown>;

/**
 * The authenticated user's application profile. Phone number, OTP data, and
 * session tokens must never be added to this contract. Public discovery will
 * eventually use a smaller, explicitly projected host-summary contract.
 */
export interface UserProfile {
  id: string;
  displayName: string | null;
  onboardingStatus: OnboardingStatus;
  avatarConfig: AvatarConfig;
  interests: string[];
  createdAt: string;
  updatedAt: string;
}

export interface UpdateMyProfileRequest {
  displayName?: string;
  interests?: string[];
}

/** The one command allowed during the minimal onboarding slice. */
export interface CompleteProfileOnboardingRequest {
  displayName: string;
}
