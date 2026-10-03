import { parseProfileRow, validateDisplayName, validateUsername } from '@/lib/profile-validation';
import { supabase } from '@/lib/supabase';
import type { ProfileOperationResult, UserProfile } from '@/types/profile';
import type { AvatarCatalogId } from '../../../packages/contracts/avatar';
import type { ClaimMyUsernameRequest, SaveMyAvatarV3Request, UpdateMyProfileRequest } from '../../../packages/contracts/user';

const PROFILE_COLUMNS_LEGACY =
  'id,display_name,onboarding_status,avatar_config,interests,bio,city_label,public_profile_enabled,profile_revision,created_at,updated_at';
const PROFILE_COLUMNS =
  'id,display_name,username,onboarding_status,avatar_config,interests,bio,city_label,public_profile_enabled,profile_revision,created_at,updated_at';

const KENNEY_APPEARANCE_IDS = new Set(['kenney-01', 'kenney-02', 'kenney-03', 'kenney-04', 'kenney-05', 'kenney-06', 'kenney-07', 'kenney-08']);

function unavailableResult(): ProfileOperationResult {
  return { ok: false, message: 'Profile service is unavailable. Check the Supabase configuration.' };
}

function providerErrorResult(): ProfileOperationResult {
  return { ok: false, message: 'We could not load your profile. Check your connection and try again.' };
}

function parseResult(value: unknown): ProfileOperationResult {
  try {
    return { ok: true, profile: parseProfileRow(value) };
  } catch {
    return {
      ok: false,
      message: 'Your profile data is incomplete or invalid. Please try again or contact support.',
    };
  }
}

export async function getMyProfile(userId: string): Promise<ProfileOperationResult> {
  if (!supabase) return unavailableResult();

  try {
    let { data, error } = await supabase
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('id', userId)
      .single();
    // The nullable username migration may be deployed separately from a
    // client build. Fall back only when the server specifically lacks the new
    // column; other errors remain visible as the normal unavailable state.
    if (error?.code === '42703' || error?.code === 'PGRST204') {
      ({ data, error } = await supabase
        .from('profiles')
        .select(PROFILE_COLUMNS_LEGACY)
        .eq('id', userId)
        .single());
    }
    if (error) return providerErrorResult();
    return parseResult(data);
  } catch {
    return providerErrorResult();
  }
}

export async function completeMyProfile(
  userId: string,
  displayName: string,
  avatarId: AvatarCatalogId,
  profile: UserProfile,
  details: UpdateMyProfileRequest = {},
): Promise<ProfileOperationResult> {
  if (!supabase) return unavailableResult();

  const validation = validateDisplayName(displayName);
  if (!validation.ok) return validation;

  try {
    // The server derives the owner from the session; an arbitrary user ID is
    // never accepted by the command. Local checks also reject stale callbacks.
    if (profile.id !== userId) return { ok: false, message: 'Open the current account profile again.' };
    const { data, error } = await supabase.rpc('update_my_profile_v2', {
      p_expected_revision: profile.profileRevision,
      p_changes: {
        display_name: validation.value,
        // V3 owns appearance through save_my_avatar_v3. Metadata edits must
        // preserve it rather than silently sending its legacy fallback back.
        ...(profile.avatarConfig.version === 3 ? {} : { avatar_id: avatarId }),
        ...(details.bio !== undefined ? { bio: details.bio } : {}),
        ...(details.cityLabel !== undefined ? { city_label: details.cityLabel } : {}),
        ...(details.interests !== undefined ? { interests: details.interests } : {}),
      },
    }).single();

    if (error) {
      if (error.code === 'P0001') return { ok: false, conflict: true, message: 'This profile changed elsewhere. Copy any draft text you want to keep, then reload the latest profile before saving.' };
      return { ok: false, message: 'We could not save your profile. Check your connection and try again.' };
    }
    return parseResult(data);
  } catch {
    return { ok: false, message: 'We could not save your profile. Check your connection and try again.' };
  }
}

/** Claim a canonical handle; the database derives the owner from the session. */
export async function claimMyUsername(
  request: ClaimMyUsernameRequest,
): Promise<ProfileOperationResult> {
  if (!supabase) return unavailableResult();
  const validation = validateUsername(request.username);
  if (!validation.ok) return validation;

  try {
    const { data, error } = await supabase.rpc('claim_my_username', {
      p_username: validation.value,
      p_expected_revision: request.expectedRevision,
    }).single();
    if (error) {
      if (error.code === 'P0001') {
        return { ok: false, conflict: true, message: 'The profile changed or that username is unavailable. Reload and try again.' };
      }
      if (error.code === '22023') return { ok: false, message: 'Choose a valid, non-reserved username.' };
      if (error.code === '42883' || error.code === 'PGRST202') {
        return { ok: false, message: 'Username claiming is not available on this server yet.' };
      }
      return { ok: false, message: 'We could not claim that username. Check your connection and try again.' };
    }
    return parseResult(data);
  } catch {
    return providerErrorResult();
  }
}

/**
 * Saves only a finite local appearance ID. The server retains the immutable
 * seed and chooses the legacy fallback, so a client cannot smuggle a URL or
 * another user's identity into profile JSON.
 */
export async function saveMyAvatarV3(
  request: SaveMyAvatarV3Request,
): Promise<ProfileOperationResult> {
  if (!supabase) return unavailableResult();
  if (!KENNEY_APPEARANCE_IDS.has(request.appearanceId)) {
    return { ok: false, message: 'Choose one of the available looks.' };
  }

  try {
    const { data, error } = await supabase.rpc('save_my_avatar_v3', {
      p_expected_revision: request.expectedRevision,
      p_appearance_id: request.appearanceId,
    }).single();
    if (error) {
      if (error.code === 'P0001') {
        return { ok: false, conflict: true, message: 'Your profile changed elsewhere. Reload before saving this look.' };
      }
      if (error.code === '42883' || error.code === 'PGRST202') {
        return { ok: false, message: 'Avatar Studio is updating on this server. Try again in a moment.' };
      }
      return { ok: false, message: 'We could not save this look. Check your connection and try again.' };
    }
    return parseResult(data);
  } catch {
    return providerErrorResult();
  }
}

export function isProfileComplete(profile: UserProfile): boolean {
  return profile.onboardingStatus === 'complete';
}
