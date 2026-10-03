/**
 * Type-only bridge to the provider-independent contract package. Metro never
 * loads this file at runtime, so Supabase-specific shapes stay in the adapter.
 */
export type {
  AvatarConfig,
  ClaimMyUsernameRequest,
  CompleteProfileOnboardingRequest,
  OnboardingStatus,
  SaveMyAvatarV3Request,
  UpdateMyProfileRequest,
  UserProfile,
} from '../../../packages/contracts/user';

import type { UserProfile } from '../../../packages/contracts/user';

export type ProfileState =
  | { status: 'signedOut'; profile: null }
  | { status: 'loading'; profile: null }
  | { status: 'needsProfile'; profile: UserProfile }
  | { status: 'ready'; profile: UserProfile }
  | { status: 'saving'; profile: UserProfile }
  | { status: 'error'; profile: UserProfile | null; message: string };

export type ProfileOperationResult =
  | { ok: true; profile: UserProfile }
  | { ok: false; message: string; conflict?: boolean };
