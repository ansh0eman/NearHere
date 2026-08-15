import {
  parseActivitySummaryRow,
  parseJoinActivityResponseRow,
  parseMyPlanRows,
  parseNearbyActivityRows,
} from '@/lib/activity-validation';
import { supabase } from '@/lib/supabase';
import type {
  CreateActivityOperationResult,
  CreateActivityRequest,
  JoinActivityOperationResult,
  MyPlansResult,
  NearbyActivitiesQuery,
  NearbyActivitiesResult,
} from '@/types/activity';

export async function getMyPlans(): Promise<MyPlansResult> {
  if (!supabase) {
    return { ok: false, message: 'Plans are unavailable. Check the Supabase configuration.' };
  }

  const { data, error } = await supabase.rpc('my_plans', { p_limit: 50 });
  if (error) {
    return { ok: false, message: 'NearHere could not load your plans. Check your connection and try again.' };
  }

  try {
    return { ok: true, plans: parseMyPlanRows(data) };
  } catch {
    return { ok: false, message: 'NearHere received an invalid plans response. Please try again.' };
  }
}

export async function joinActivity(activityId: string): Promise<JoinActivityOperationResult> {
  if (!supabase) {
    return { ok: false, message: 'Joining is unavailable. Check the Supabase configuration.' };
  }

  const { data, error } = await supabase.rpc('join_activity', { p_activity_id: activityId });
  if (error) {
    if (error.code === 'P0001') return { ok: false, message: 'Complete your profile before joining.' };
    if (error.code === 'P0002') return { ok: false, message: 'This activity is no longer available.' };
    if (error.code === 'P0003') return { ok: false, message: 'You cannot rejoin this activity.' };
    return { ok: false, message: 'NearHere could not join the activity. Please try again.' };
  }

  try {
    if (!Array.isArray(data) || data.length !== 1) throw new Error('Expected one join result.');
    return { ok: true, result: parseJoinActivityResponseRow(data[0]) };
  } catch {
    return { ok: false, message: 'NearHere received an invalid join response. Please try again.' };
  }
}

export async function createActivity(
  request: CreateActivityRequest,
): Promise<CreateActivityOperationResult> {
  if (!supabase) {
    return { ok: false, message: 'Activity creation is unavailable. Check the Supabase configuration.' };
  }

  const { data, error } = await supabase.rpc('create_activity', {
    p_kind: request.kind,
    p_title: request.title,
    p_description: request.description,
    p_starts_at: request.startsAt,
    p_ends_at: request.endsAt,
    p_private_latitude: request.privateLatitude,
    p_private_longitude: request.privateLongitude,
    p_privacy_radius_m: request.privacyRadiusM,
    p_capacity: request.capacity,
    p_join_mode: request.joinMode,
  });

  if (error) {
    if (error.code === 'P0001') return { ok: false, message: 'Complete your profile before hosting.' };
    return { ok: false, message: 'NearHere could not create the activity. Check the details and try again.' };
  }

  try {
    if (!Array.isArray(data) || data.length !== 1) throw new Error('Expected one created activity.');
    return { ok: true, activity: parseActivitySummaryRow(data[0]) };
  } catch {
    return { ok: false, message: 'NearHere received an invalid creation response. Please try again.' };
  }
}

export async function getNearbyActivities(
  query: NearbyActivitiesQuery,
): Promise<NearbyActivitiesResult> {
  if (!supabase) {
    return { ok: false, message: 'Live activities are unavailable. Check the Supabase configuration.' };
  }

  const { data, error } = await supabase.rpc('nearby_activities', {
    p_latitude: query.latitude,
    p_longitude: query.longitude,
    p_radius_m: query.radiusM,
    p_kinds: query.kinds?.length ? query.kinds : undefined,
    p_starts_before: query.startsBefore,
    p_limit: query.limit ?? 50,
  });

  if (error) {
    return { ok: false, message: 'NearHere could not load activities. Check your connection and try again.' };
  }

  try {
    return { ok: true, activities: parseNearbyActivityRows(data) };
  } catch {
    return { ok: false, message: 'NearHere received an invalid activity response. Please try again.' };
  }
}
