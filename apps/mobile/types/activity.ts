export type {
  ActivityKind,
  ActivityStatus,
  ActivitySummary,
  CreateActivityRequest,
  CreateActivityResponse,
  JoinMode,
  NearbyActivitiesQuery,
  NearbyActivitySummary,
  PublicActivityLocation,
} from '../../../packages/contracts/activity';

import type { ActivityKind, ActivitySummary, NearbyActivitySummary } from '../../../packages/contracts/activity';

export type ActivityFilter = 'all' | Extract<ActivityKind, 'walk' | 'coffee' | 'sports'>;

export type NearbyActivitiesState =
  | { status: 'loading'; activities: NearbyActivitySummary[] }
  | { status: 'ready'; activities: NearbyActivitySummary[] }
  | { status: 'error'; activities: NearbyActivitySummary[]; message: string };

export type NearbyActivitiesResult =
  | { ok: true; activities: NearbyActivitySummary[] }
  | { ok: false; message: string };

export type CreateActivityOperationResult =
  | { ok: true; activity: ActivitySummary }
  | { ok: false; message: string };
