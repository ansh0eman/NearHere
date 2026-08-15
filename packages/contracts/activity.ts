export type ActivityKind =
  | 'walk'
  | 'coffee'
  | 'sports'
  | 'study'
  | 'coworking'
  | 'creative'
  | 'other';

export type ActivityStatus = 'published' | 'cancelled' | 'completed';
export type JoinMode = 'open' | 'approval';
export type ActivityMembershipRole = 'host' | 'participant';
export type ActivityMembershipStatus =
  | 'pending'
  | 'accepted'
  | 'waitlisted'
  | 'rejected'
  | 'left'
  | 'removed';
export type JoinActivityOutcome = Extract<
  ActivityMembershipStatus,
  'accepted' | 'pending' | 'waitlisted'
>;

export interface PublicActivityLocation {
  latitude: number;
  longitude: number;
  privacyRadiusM: number;
}

export interface CreateActivityRequest {
  kind: ActivityKind;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  privateLatitude: number;
  privateLongitude: number;
  privacyRadiusM: number;
  capacity: number;
  joinMode: JoinMode;
}

export interface NearbyActivitiesQuery {
  latitude: number;
  longitude: number;
  radiusM: number;
  kinds?: ActivityKind[];
  startsBefore?: string;
  limit?: number;
}

export interface ActivitySummary {
  id: string;
  kind: ActivityKind;
  title: string;
  description: string;
  status: ActivityStatus;
  startsAt: string;
  endsAt: string;
  publicLocation: PublicActivityLocation;
  hostDisplayName: string;
  participantCount: number;
  capacity: number;
  joinMode: JoinMode;
}

export interface NearbyActivitySummary extends ActivitySummary {
  /** Straight-line distance from the requested discovery center. */
  distanceM: number;
}

export interface ExactActivityLocation {
  latitude: number;
  longitude: number;
}

/**
 * A caller-scoped plan. Exact coordinates are present only when the caller's
 * durable membership is accepted; pending and waitlisted callers receive null.
 */
export interface MyPlanSummary extends ActivitySummary {
  membershipRole: ActivityMembershipRole;
  membershipStatus: Extract<ActivityMembershipStatus, 'pending' | 'accepted' | 'waitlisted'>;
  exactMeetingLocation: ExactActivityLocation | null;
}

export interface CreateActivityResponse {
  activity: ActivitySummary;
}

export interface JoinActivityResponse {
  membershipStatus: JoinActivityOutcome;
  participantCount: number;
}

export interface LeaveActivityResponse {
  membershipStatus: Extract<ActivityMembershipStatus, 'left'>;
  participantCount: number;
  waitlistPromoted: boolean;
}

export type MembershipRequestDecision = 'approve' | 'reject';

export interface DecideMembershipRequestResponse {
  membershipStatus: Extract<ActivityMembershipStatus, 'accepted' | 'waitlisted' | 'rejected'>;
  participantCount: number;
}

/** A pending join request visible only to the activity host. */
export interface MembershipRequestSummary {
  requesterUserId: string;
  requesterDisplayName: string;
  requestedAt: string;
}

export interface ActivityEvent {
  id: string;
  type: 'activity.created' | 'activity.updated' | 'activity.participant_count_changed';
  occurredAt: string;
  scope: string;
  data: Record<string, unknown>;
}
