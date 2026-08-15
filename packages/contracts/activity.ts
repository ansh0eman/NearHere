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

export interface CreateActivityResponse {
  activity: ActivitySummary;
}

export interface ActivityEvent {
  id: string;
  type: 'activity.created' | 'activity.updated' | 'activity.participant_count_changed';
  occurredAt: string;
  scope: string;
  data: Record<string, unknown>;
}
