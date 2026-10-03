import {
  parseActivityDetailRow,
  parseCancelActivityResponseRow,
  parseActivitySummaryRow,
  parseDecideMembershipRequestResponseRow,
  parseJoinActivityResponseRow,
  parseLeaveActivityResponseRow,
  parseRemoveParticipantResponseRow,
  parseHostActivityParticipantRows,
  parseActivityMessageRows,
  parseMembershipRequestRows,
  parseMyPlanRows,
  parseNearbyActivityRows,
} from '@/lib/activity-validation';
import { supabase } from '@/lib/supabase';
import { parseOperatorSafetyReports, parseSafetyReviewReceipt } from '@/lib/safety-validation';
import { createRequestId, logClientOperation } from '@/lib/request-context';
import { appFailure } from '@/lib/app-error';
import type {
  ActivityDetailResult,
  CancelActivityOperationResult,
  CreateActivityOperationResult,
  CreateActivityRequest,
  DecideMembershipRequestInput,
  DecideMembershipRequestOperationResult,
  JoinActivityOperationResult,
  LeaveActivityOperationResult,
  RemoveParticipantOperationResult,
  HostActivityParticipantsResult,
  SafetyOperationResult,
  ActivityMessagesResult,
  SendActivityMessageResult,
  MembershipRequestsResult,
  MyPlansResult,
  NearbyActivitiesQuery,
  NearbyActivitiesResult,
} from '@/types/activity';
import type { OperatorReportsResult, SafetyReviewResult } from '@/types/safety';

export async function getActivityDetail(activityId: string): Promise<ActivityDetailResult> {
  if (!supabase) {
    return { ok: false, message: 'Activity details are unavailable. Check the Supabase configuration.' };
  }

  const { data, error } = await supabase.rpc('activity_detail_with_avatar', { p_activity_id: activityId });
  if (error) {
    if (error.code === 'P0002') return { ok: false, message: 'This activity is no longer available.' };
    return { ok: false, message: 'NearHere could not load this activity. Check your connection and try again.' };
  }

  try {
    if (!Array.isArray(data) || data.length !== 1) throw new Error('Expected one activity detail.');
    return { ok: true, activity: parseActivityDetailRow(data[0]) };
  } catch {
    return { ok: false, message: 'NearHere received an invalid activity response. Please try again.' };
  }
}

export async function cancelActivity(activityId: string): Promise<CancelActivityOperationResult> {
  if (!supabase) {
    return { ok: false, message: 'Cancellation is unavailable. Check the Supabase configuration.' };
  }

  const { data, error } = await supabase.rpc('cancel_activity', { p_activity_id: activityId });
  if (error) {
    if (error.code === '42501') return { ok: false, message: 'Only the activity host can cancel it.' };
    if (error.code === 'P0002') return { ok: false, message: 'This activity is no longer available.' };
    if (error.code === 'P0003') return { ok: false, message: 'Only an upcoming or active activity can be cancelled.' };
    return { ok: false, message: 'NearHere could not cancel the activity. Please try again.' };
  }

  try {
    if (!Array.isArray(data) || data.length !== 1) throw new Error('Expected one cancellation result.');
    return { ok: true, result: parseCancelActivityResponseRow(data[0]) };
  } catch {
    return { ok: false, message: 'NearHere received an invalid cancellation response. Please try again.' };
  }
}

export async function getMembershipRequests(activityId: string): Promise<MembershipRequestsResult> {
  if (!supabase) {
    return { ok: false, message: 'Join requests are unavailable. Check the Supabase configuration.' };
  }

  const { data, error } = await supabase.rpc('host_pending_activity_requests', {
    p_activity_id: activityId,
    p_limit: 50,
  });
  if (error) {
    return { ok: false, message: 'NearHere could not load join requests. Check your connection and try again.' };
  }

  try {
    return { ok: true, requests: parseMembershipRequestRows(data) };
  } catch {
    return { ok: false, message: 'NearHere received an invalid join requests response. Please try again.' };
  }
}

export async function leaveActivity(activityId: string): Promise<LeaveActivityOperationResult> {
  if (!supabase) {
    return { ok: false, message: 'Leaving is unavailable. Check the Supabase configuration.' };
  }

  const { data, error } = await supabase.rpc('leave_activity', { p_activity_id: activityId });
  if (error) {
    if (error.code === 'P0002') return { ok: false, message: 'This activity is no longer available.' };
    if (error.code === 'P0003') return { ok: false, message: 'You are not an active participant in this activity.' };
    return { ok: false, message: 'NearHere could not leave the activity. Please try again.' };
  }

  try {
    if (!Array.isArray(data) || data.length !== 1) throw new Error('Expected one leave result.');
    return { ok: true, result: parseLeaveActivityResponseRow(data[0]) };
  } catch {
    return { ok: false, message: 'NearHere received an invalid leave response. Please try again.' };
  }
}

export async function removeActivityParticipant(
  activityId: string,
  participantUserId: string,
): Promise<RemoveParticipantOperationResult> {
  if (!supabase) {
    return { ok: false, message: 'Participant removal is unavailable. Check the Supabase configuration.' };
  }

  const { data, error } = await supabase.rpc('remove_activity_participant', {
    p_activity_id: activityId,
    p_participant_user_id: participantUserId,
  });
  if (error) {
    if (error.code === '42501') return { ok: false, message: 'Only the activity host can remove participants.' };
    if (error.code === 'P0002') return { ok: false, message: 'This participant is no longer in the activity.' };
    if (error.code === 'P0003') return { ok: false, message: 'This participant cannot be removed in their current state.' };
    return { ok: false, message: 'NearHere could not remove this participant. Please try again.' };
  }

  try {
    if (!Array.isArray(data) || data.length !== 1) throw new Error('Expected one removal result.');
    return { ok: true, result: parseRemoveParticipantResponseRow(data[0]) };
  } catch {
    return { ok: false, message: 'NearHere received an invalid participant-removal response. Please try again.' };
  }
}

export async function getHostActivityParticipants(activityId: string): Promise<HostActivityParticipantsResult> {
  if (!supabase) return { ok: false, message: 'Participants are unavailable. Check the Supabase configuration.' };
  const { data, error } = await supabase.rpc('host_activity_participants', { p_activity_id: activityId });
  if (error) return { ok: false, message: 'NearHere could not load participants. Check your connection and try again.' };
  try { return { ok: true, participants: parseHostActivityParticipantRows(data) }; }
  catch { return { ok: false, message: 'NearHere received an invalid participants response. Please try again.' }; }
}

export async function reportActivity(activityId: string, reason: string, details = ''): Promise<SafetyOperationResult> {
  const requestId = createRequestId('report-safety');
  logClientOperation(requestId, 'report safety issue', 'started');
  if (!supabase) {
    return appFailure('configuration_unavailable', 'Reporting is unavailable. Check the Supabase configuration.', false, requestId);
  }
  const { data, error } = await supabase.rpc('report_safety_issue', {
    p_activity_id: activityId,
    p_reason: reason,
    p_details: details,
  });
  if (error) {
    logClientOperation(requestId, 'report safety issue', 'failed');
    if (error.code === '42501') {
      return appFailure('forbidden', 'Sign in to report an activity.', false, requestId);
    }
    return appFailure(
      error.code === 'P0004' ? 'rate_limited' : 'network_failure',
      error.code === 'P0004'
        ? 'You have submitted several reports recently. Please try again shortly.'
        : 'NearHere could not submit the report. Please try again.',
      true,
      requestId,
    );
  }
  if (!Array.isArray(data) || data.length !== 1 || data[0]?.reported !== true) {
    logClientOperation(requestId, 'report safety issue', 'failed');
    return appFailure('invalid_response', 'NearHere received an invalid report response. Please try again.', true, requestId);
  }
  logClientOperation(requestId, 'report safety issue', 'succeeded');
  return { ok: true };
}

export async function blockActivityHost(activityId: string): Promise<SafetyOperationResult> {
  const requestId = createRequestId('block-host');
  logClientOperation(requestId, 'block host', 'started');
  if (!supabase) {
    return appFailure('configuration_unavailable', 'Blocking is unavailable. Check the Supabase configuration.', false, requestId);
  }
  const { data, error } = await supabase.rpc('block_activity_host', { p_activity_id: activityId });
  if (error) {
    logClientOperation(requestId, 'block host', 'failed');
    return appFailure(error.code === 'P0004' ? 'rate_limited' : 'network_failure', 'NearHere could not block this host. Please try again.', true, requestId);
  }
  if (!Array.isArray(data) || data.length !== 1 || data[0]?.blocked !== true) {
    logClientOperation(requestId, 'block host', 'failed');
    return appFailure('invalid_response', 'NearHere received an invalid block response. Please try again.', true, requestId);
  }
  logClientOperation(requestId, 'block host', 'succeeded');
  return { ok: true };
}

export async function getOperatorSafetyReports(status = 'open'): Promise<OperatorReportsResult> {
  if (!supabase) return { ok: false, message: 'Safety operations are unavailable. Check the Supabase configuration.' };
  const { data, error } = await supabase.rpc('operator_safety_reports', { p_status: status, p_limit: 50 });
  if (error) return { ok: false, message: error.code === '42501' ? 'Operator access is required.' : 'NearHere could not load the safety queue.' };
  try { return { ok: true, reports: parseOperatorSafetyReports(data) }; }
  catch { return { ok: false, message: 'NearHere received an invalid safety queue response.' }; }
}

export async function reviewSafetyReport(reportId: string, decision: 'open' | 'reviewing' | 'resolved' | 'dismissed', resolution = ''): Promise<SafetyReviewResult> {
  if (!supabase) return { ok: false, message: 'Safety operations are unavailable. Check the Supabase configuration.' };
  const { data, error } = await supabase.rpc('review_safety_report', { p_report_id: reportId, p_decision: decision, p_resolution: resolution || null });
  if (error) return { ok: false, message: error.code === '42501' ? 'Operator access is required.' : 'NearHere could not review this report.' };
  try {
    if (!Array.isArray(data) || data.length !== 1) throw new Error('Expected one review receipt.');
    return { ok: true, receipt: parseSafetyReviewReceipt(data[0]) };
  } catch { return { ok: false, message: 'NearHere received an invalid review response.' }; }
}

export async function getActivityMessages(activityId: string): Promise<ActivityMessagesResult> {
  if (!supabase) return { ok: false, message: 'Chat is unavailable. Check the Supabase configuration.' };
  const { data, error } = await supabase.rpc('activity_messages', { p_activity_id: activityId, p_limit: 50 });
  if (error) return { ok: false, message: 'NearHere could not load activity chat. Check your connection and try again.' };
  try { return { ok: true, messages: parseActivityMessageRows(data) }; }
  catch { return { ok: false, message: 'NearHere received an invalid chat response. Please try again.' }; }
}

export async function sendActivityMessage(activityId: string, body: string): Promise<SendActivityMessageResult> {
  if (!supabase) return { ok: false, message: 'Chat is unavailable. Check the Supabase configuration.' };
  const { data, error } = await supabase.rpc('send_activity_message', { p_activity_id: activityId, p_body: body });
  if (error) return { ok: false, message: 'NearHere could not send that message. Please try again.' };
  try {
    const messages = parseActivityMessageRows(data);
    if (messages.length !== 1) throw new Error('Expected one sent message.');
    return { ok: true, message: messages[0] };
  } catch { return { ok: false, message: 'NearHere received an invalid send response. Please try again.' }; }
}

export async function decideMembershipRequest(
  input: DecideMembershipRequestInput,
): Promise<DecideMembershipRequestOperationResult> {
  if (!supabase) {
    return { ok: false, message: 'Request decisions are unavailable. Check the Supabase configuration.' };
  }

  const { data, error } = await supabase.rpc('decide_activity_request', {
    p_activity_id: input.activityId,
    p_requester_user_id: input.requesterUserId,
    p_decision: input.decision,
  });
  if (error) {
    if (error.code === '42501') return { ok: false, message: 'Only the activity host can decide this request.' };
    if (error.code === 'P0002') return { ok: false, message: 'This join request is no longer pending.' };
    if (error.code === 'P0003') return { ok: false, message: 'This join request was already decided.' };
    return { ok: false, message: 'NearHere could not update the join request. Please try again.' };
  }

  try {
    if (!Array.isArray(data) || data.length !== 1) throw new Error('Expected one decision result.');
    return { ok: true, result: parseDecideMembershipRequestResponseRow(data[0]) };
  } catch {
    return { ok: false, message: 'NearHere received an invalid request decision response. Please try again.' };
  }
}

export async function getMyPlans(): Promise<MyPlansResult> {
  if (!supabase) {
    return { ok: false, message: 'Plans are unavailable. Check the Supabase configuration.' };
  }

  const { data, error } = await supabase.rpc('my_plans_with_avatars', { p_limit: 50 });
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
    if (error.code === 'P0004') return { ok: false, message: 'You are already hosting this activity.' };
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

  const { data, error } = await supabase.rpc('create_activity_idempotent', {
    p_request_id: request.requestId,
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
    if (error.code === 'P0005') return { ok: false, message: 'This publish retry no longer matches the activity draft. Review the details and try again.' };
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

  const { data, error } = await supabase.rpc('nearby_activities_with_avatars', {
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
