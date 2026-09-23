import type {
  ActivityDetail,
  ActivityKind,
  ActivityMembershipRole,
  ActivitySummary,
  ActivityStatus,
  CancelActivityResponse,
  DecideMembershipRequestResponse,
  JoinMode,
  JoinActivityResponse,
  JoinActivityOutcome,
  LeaveActivityResponse,
  RemoveParticipantResponse,
  HostActivityParticipant,
  ActivityMessage,
  MembershipRequestSummary,
  MyPlanSummary,
  NearbyActivitySummary,
} from '@/types/activity';

const ACTIVITY_KINDS: ActivityKind[] = [
  'walk',
  'coffee',
  'sports',
  'study',
  'coworking',
  'creative',
  'other',
];
const ACTIVITY_STATUSES: ActivityStatus[] = ['published', 'cancelled', 'completed'];
const JOIN_MODES: JoinMode[] = ['open', 'approval'];
const JOIN_OUTCOMES: JoinActivityOutcome[] = ['pending', 'accepted', 'waitlisted'];
const MEMBERSHIP_ROLES: ActivityMembershipRole[] = ['host', 'participant'];
const PLAN_MEMBERSHIP_STATUSES = ['pending', 'accepted', 'waitlisted'] as const;
const ACTIVITY_MEMBERSHIP_STATUSES = [
  'pending',
  'accepted',
  'waitlisted',
  'rejected',
  'left',
  'removed',
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireString(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Activity response has an invalid ${key}.`);
  }
  return value;
}

function requireFiniteNumber(row: Record<string, unknown>, key: string): number {
  const value = row[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Activity response has an invalid ${key}.`);
  }
  return value;
}

function requireInteger(row: Record<string, unknown>, key: string): number {
  const value = requireFiniteNumber(row, key);
  if (!Number.isInteger(value)) throw new Error(`Activity response has an invalid ${key}.`);
  return value;
}

function requireTimestamp(row: Record<string, unknown>, key: string): string {
  const value = requireString(row, key);
  if (!Number.isFinite(Date.parse(value))) throw new Error(`Activity response has an invalid ${key}.`);
  return value;
}

export function parseActivitySummaryRow(value: unknown): ActivitySummary {
  if (!isRecord(value)) throw new Error('Activity response is not an object.');

  const kind = value.kind;
  const status = value.status;
  const joinMode = value.join_mode;
  if (!ACTIVITY_KINDS.includes(kind as ActivityKind)) {
    throw new Error('Activity response has an invalid kind.');
  }
  if (!ACTIVITY_STATUSES.includes(status as ActivityStatus)) {
    throw new Error('Activity response has an invalid status.');
  }
  if (!JOIN_MODES.includes(joinMode as JoinMode)) {
    throw new Error('Activity response has an invalid join_mode.');
  }

  const latitude = requireFiniteNumber(value, 'public_latitude');
  const longitude = requireFiniteNumber(value, 'public_longitude');
  const privacyRadiusM = requireInteger(value, 'privacy_radius_m');
  const participantCount = requireInteger(value, 'participant_count');
  const capacity = requireInteger(value, 'capacity');
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new Error('Activity response contains invalid public coordinates.');
  }
  if (participantCount < 0 || capacity < 2 || participantCount > capacity) {
    throw new Error('Activity response contains invalid participant capacity.');
  }
  if (privacyRadiusM < 150 || privacyRadiusM > 1000) {
    throw new Error('Activity response contains invalid distance metadata.');
  }

  return {
    id: requireString(value, 'id'),
    kind: kind as ActivityKind,
    title: requireString(value, 'title'),
    description: typeof value.description === 'string' ? value.description : '',
    status: status as ActivityStatus,
    startsAt: requireTimestamp(value, 'starts_at'),
    endsAt: requireTimestamp(value, 'ends_at'),
    publicLocation: { latitude, longitude, privacyRadiusM },
    hostDisplayName: requireString(value, 'host_display_name'),
    participantCount,
    capacity,
    joinMode: joinMode as JoinMode,
  };
}

export function parseNearbyActivityRow(value: unknown): NearbyActivitySummary {
  if (!isRecord(value)) throw new Error('Activity response is not an object.');
  const distanceM = requireFiniteNumber(value, 'distance_m');
  if (distanceM < 0) throw new Error('Activity response contains invalid distance metadata.');
  return { ...parseActivitySummaryRow(value), distanceM };
}

export function parseNearbyActivityRows(value: unknown): NearbyActivitySummary[] {
  if (!Array.isArray(value)) throw new Error('Nearby activities response is not a list.');
  return value.map(parseNearbyActivityRow);
}

export function parseActivityDetailRow(value: unknown): ActivityDetail {
  if (!isRecord(value)) throw new Error('Activity detail response is not an object.');

  const membershipRole = value.membership_role;
  const membershipStatus = value.membership_status;
  if (membershipRole !== null && !MEMBERSHIP_ROLES.includes(membershipRole as ActivityMembershipRole)) {
    throw new Error('Activity detail response has an invalid membership_role.');
  }
  if (
    membershipStatus !== null
    && !ACTIVITY_MEMBERSHIP_STATUSES.includes(
      membershipStatus as (typeof ACTIVITY_MEMBERSHIP_STATUSES)[number],
    )
  ) {
    throw new Error('Activity detail response has an invalid membership_status.');
  }
  if ((membershipRole === null) !== (membershipStatus === null)) {
    throw new Error('Activity detail response has inconsistent membership fields.');
  }
  if (membershipRole === 'host' && membershipStatus !== 'accepted') {
    throw new Error('Activity detail response has an invalid host membership.');
  }

  const summary = parseActivitySummaryRow(value);
  const exactLatitude = value.exact_latitude;
  const exactLongitude = value.exact_longitude;
  let exactMeetingLocation = null;
  const maySeeExactLocation = membershipStatus === 'accepted'
    && summary.status === 'published'
    && Date.parse(summary.endsAt) > Date.now();
  if (maySeeExactLocation) {
    const latitude = requireFiniteNumber(value, 'exact_latitude');
    const longitude = requireFiniteNumber(value, 'exact_longitude');
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      throw new Error('Activity detail response contains invalid exact coordinates.');
    }
    exactMeetingLocation = { latitude, longitude };
  } else if (exactLatitude !== null || exactLongitude !== null) {
    throw new Error('Activity detail response exposed exact coordinates without authorization.');
  }

  return {
    ...summary,
    exactMeetingLocation,
    membershipRole: membershipRole as ActivityDetail['membershipRole'],
    membershipStatus: membershipStatus as ActivityDetail['membershipStatus'],
  };
}

export function parseMyPlanRow(value: unknown): MyPlanSummary {
  if (!isRecord(value)) throw new Error('Plan response is not an object.');

  const membershipRole = value.membership_role;
  const membershipStatus = value.membership_status;
  if (!MEMBERSHIP_ROLES.includes(membershipRole as ActivityMembershipRole)) {
    throw new Error('Plan response has an invalid membership_role.');
  }
  if (!PLAN_MEMBERSHIP_STATUSES.includes(membershipStatus as (typeof PLAN_MEMBERSHIP_STATUSES)[number])) {
    throw new Error('Plan response has an invalid membership_status.');
  }
  if (membershipRole === 'host' && membershipStatus !== 'accepted') {
    throw new Error('Plan response has an invalid host membership.');
  }

  const exactLatitude = value.exact_latitude;
  const exactLongitude = value.exact_longitude;
  let exactMeetingLocation = null;
  const isActivePublishedPlan = value.status === 'published'
    && Date.parse(String(value.ends_at)) > Date.now();
  if (membershipStatus === 'accepted' && isActivePublishedPlan) {
    const latitude = requireFiniteNumber(value, 'exact_latitude');
    const longitude = requireFiniteNumber(value, 'exact_longitude');
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      throw new Error('Plan response contains invalid exact coordinates.');
    }
    exactMeetingLocation = { latitude, longitude };
  } else if (exactLatitude !== null || exactLongitude !== null) {
    throw new Error('Plan response exposed exact coordinates before acceptance.');
  }

  return {
    ...parseActivitySummaryRow(value),
    membershipRole: membershipRole as ActivityMembershipRole,
    membershipStatus: membershipStatus as MyPlanSummary['membershipStatus'],
    exactMeetingLocation,
  };
}

export function parseMyPlanRows(value: unknown): MyPlanSummary[] {
  if (!Array.isArray(value)) throw new Error('Plans response is not a list.');
  return value.map(parseMyPlanRow);
}

export function parseJoinActivityResponseRow(value: unknown): JoinActivityResponse {
  if (!isRecord(value)) throw new Error('Join response is not an object.');
  const membershipStatus = value.membership_status;
  if (!JOIN_OUTCOMES.includes(membershipStatus as JoinActivityOutcome)) {
    throw new Error('Join response has an invalid membership_status.');
  }
  const participantCount = requireInteger(value, 'participant_count');
  if (participantCount < 1) throw new Error('Join response has an invalid participant_count.');
  return { membershipStatus: membershipStatus as JoinActivityOutcome, participantCount };
}

function parseParticipantMutationRow(
  value: unknown,
  allowedStatuses: readonly string[],
  responseName: string,
) {
  if (!isRecord(value)) throw new Error(`${responseName} response is not an object.`);
  const membershipStatus = value.membership_status;
  if (typeof membershipStatus !== 'string' || !allowedStatuses.includes(membershipStatus)) {
    throw new Error(`${responseName} response has an invalid membership_status.`);
  }
  const participantCount = requireInteger(value, 'participant_count');
  if (participantCount < 1) throw new Error(`${responseName} response has an invalid participant_count.`);
  return { membershipStatus, participantCount };
}

export function parseLeaveActivityResponseRow(value: unknown): LeaveActivityResponse {
  const parsed = parseParticipantMutationRow(value, ['left'], 'Leave');
  if (!isRecord(value) || typeof value.waitlist_promoted !== 'boolean') {
    throw new Error('Leave response has an invalid waitlist_promoted.');
  }
  return { ...parsed, waitlistPromoted: value.waitlist_promoted } as LeaveActivityResponse;
}

export function parseRemoveParticipantResponseRow(value: unknown): RemoveParticipantResponse {
  const parsed = parseParticipantMutationRow(value, ['removed'], 'Remove participant');
  if (!isRecord(value) || typeof value.waitlist_promoted !== 'boolean') {
    throw new Error('Remove participant response has an invalid waitlist_promoted.');
  }
  return { ...parsed, waitlistPromoted: value.waitlist_promoted } as RemoveParticipantResponse;
}

export function parseHostActivityParticipantRows(value: unknown): HostActivityParticipant[] {
  if (!Array.isArray(value)) throw new Error('Participant response is not a list.');
  return value.map((item) => {
    if (!isRecord(item)) throw new Error('Participant response is not an object.');
    const status = item.membership_status;
    if (status !== 'accepted' && status !== 'waitlisted') throw new Error('Participant response has an invalid status.');
    return {
      participantUserId: requireString(item, 'participant_user_id'),
      participantDisplayName: requireString(item, 'participant_display_name'),
      membershipStatus: status,
      joinedAt: item.joined_at === null ? null : requireTimestamp(item, 'joined_at'),
    } as HostActivityParticipant;
  });
}

export function parseActivityMessageRows(value: unknown): ActivityMessage[] {
  if (!Array.isArray(value)) throw new Error('Message response is not a list.');
  return value.map((item) => {
    if (!isRecord(item)) throw new Error('Message response is not an object.');
    return {
      id: requireString(item, 'id'),
      activityId: requireString(item, 'activity_id'),
      authorUserId: requireString(item, 'author_user_id'),
      authorDisplayName: requireString(item, 'author_display_name'),
      body: requireString(item, 'body'),
      createdAt: requireTimestamp(item, 'created_at'),
    };
  });
}

export function parseCancelActivityResponseRow(value: unknown): CancelActivityResponse {
  if (!isRecord(value) || value.status !== 'cancelled') {
    throw new Error('Cancel response has an invalid status.');
  }
  return {
    activityId: requireString(value, 'activity_id'),
    cancelledAt: requireTimestamp(value, 'cancelled_at'),
    status: 'cancelled',
  };
}

export function parseDecideMembershipRequestResponseRow(
  value: unknown,
): DecideMembershipRequestResponse {
  return parseParticipantMutationRow(
    value,
    ['accepted', 'waitlisted', 'rejected'],
    'Membership decision',
  ) as DecideMembershipRequestResponse;
}

export function parseMembershipRequestRow(value: unknown): MembershipRequestSummary {
  if (!isRecord(value)) throw new Error('Membership request response is not an object.');

  return {
    requesterUserId: requireString(value, 'requester_user_id'),
    requesterDisplayName: requireString(value, 'requester_display_name'),
    requestedAt: requireTimestamp(value, 'requested_at'),
  };
}

export function parseMembershipRequestRows(value: unknown): MembershipRequestSummary[] {
  if (!Array.isArray(value)) throw new Error('Membership requests response is not a list.');
  return value.map(parseMembershipRequestRow);
}
