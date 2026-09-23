import { parseProfileRow, validateDisplayName } from '@/lib/profile-validation';
import { supabase } from '@/lib/supabase';
import type { ProfileOperationResult, UserProfile } from '@/types/profile';

const PROFILE_COLUMNS =
  'id,display_name,onboarding_status,avatar_config,interests,created_at,updated_at';

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

  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', userId)
    .single();

  if (error) return providerErrorResult();
  return parseResult(data);
}

export async function completeMyProfile(
  userId: string,
  displayName: string,
): Promise<ProfileOperationResult> {
  if (!supabase) return unavailableResult();

  const validation = validateDisplayName(displayName);
  if (!validation.ok) return validation;

  const { data, error } = await supabase
    .from('profiles')
    .update({
      display_name: validation.value,
      onboarding_status: 'complete',
    })
    .eq('id', userId)
    .select(PROFILE_COLUMNS)
    .single();

  if (error) {
    return { ok: false, message: 'We could not save your profile. Check your connection and try again.' };
  }
  return parseResult(data);
}

export function isProfileComplete(profile: UserProfile): boolean {
  return profile.onboardingStatus === 'complete';
}
