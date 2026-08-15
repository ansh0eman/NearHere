export type {
  ActivityKind,
  ActivityMembershipRole,
  ActivityMembershipStatus,
  ActivityStatus,
  ActivitySummary,
  CreateActivityRequest,
  CreateActivityResponse,
  ExactActivityLocation,
  JoinActivityResponse,
  JoinActivityOutcome,
  JoinMode,
  MyPlanSummary,
  NearbyActivitiesQuery,
  NearbyActivitySummary,
  PublicActivityLocation,
} from '../../../packages/contracts/activity';

import type {
  ActivityKind,
  ActivitySummary,
  JoinActivityResponse,
  MyPlanSummary,
  NearbyActivitySummary,
} from '../../../packages/contracts/activity';

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

export type JoinActivityOperationResult =
  | { ok: true; result: JoinActivityResponse }
  | { ok: false; message: string };

export type MyPlansResult =
  | { ok: true; plans: MyPlanSummary[] }
  | { ok: false; message: string };

export type MyPlansState =
  | { status: 'signedOut'; plans: [] }
  | { status: 'loading'; plans: MyPlanSummary[] }
  | { status: 'ready'; plans: MyPlanSummary[] }
  | { status: 'error'; plans: MyPlanSummary[]; message: string };
