export type {
  ActivityDetail,
  ActivityKind,
  ActivityMembershipRole,
  ActivityMembershipStatus,
  ActivityStatus,
  ActivitySummary,
  CancelActivityResponse,
  CreateActivityRequest,
  CreateActivityResponse,
  DecideMembershipRequestResponse,
  ExactActivityLocation,
  JoinActivityResponse,
  JoinActivityOutcome,
  JoinMode,
  LeaveActivityResponse,
  RemoveParticipantResponse,
  HostActivityParticipant,
  ActivityMessage,
  MembershipRequestDecision,
  MembershipRequestSummary,
  MyPlanSummary,
  NearbyActivitiesQuery,
  NearbyActivitySummary,
  PublicActivityLocation,
} from '../../../packages/contracts/activity';

import type {
  ActivityDetail,
  ActivityKind,
  ActivitySummary,
  CancelActivityResponse,
  DecideMembershipRequestResponse,
  JoinActivityResponse,
  LeaveActivityResponse,
  RemoveParticipantResponse,
  HostActivityParticipant,
  ActivityMessage,
  MembershipRequestDecision,
  MembershipRequestSummary,
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

export type ActivityDetailResult =
  | { ok: true; activity: ActivityDetail }
  | { ok: false; message: string };

export type ActivityDetailState =
  | { status: 'loading'; activity: ActivityDetail | null }
  | { status: 'ready'; activity: ActivityDetail }
  | { status: 'error'; activity: ActivityDetail | null; message: string };

export type CreateActivityOperationResult =
  | { ok: true; activity: ActivitySummary }
  | { ok: false; message: string };

export type JoinActivityOperationResult =
  | { ok: true; result: JoinActivityResponse }
  | { ok: false; message: string };

export type LeaveActivityOperationResult =
  | { ok: true; result: LeaveActivityResponse }
  | { ok: false; message: string };

export type RemoveParticipantOperationResult =
  | { ok: true; result: RemoveParticipantResponse }
  | { ok: false; message: string };

export type HostActivityParticipantsResult =
  | { ok: true; participants: HostActivityParticipant[] }
  | { ok: false; message: string };

export type SafetyOperationResult =
  | { ok: true }
  | { ok: false; message: string };

export type ActivityMessagesResult =
  | { ok: true; messages: ActivityMessage[] }
  | { ok: false; message: string };

export type SendActivityMessageResult =
  | { ok: true; message: ActivityMessage }
  | { ok: false; message: string };

export type CancelActivityOperationResult =
  | { ok: true; result: CancelActivityResponse }
  | { ok: false; message: string };

export type DecideMembershipRequestOperationResult =
  | { ok: true; result: DecideMembershipRequestResponse }
  | { ok: false; message: string };

export interface DecideMembershipRequestInput {
  activityId: string;
  requesterUserId: string;
  decision: MembershipRequestDecision;
}

export interface HostedMembershipRequest extends MembershipRequestSummary {
  activityId: string;
  activityTitle: string;
  activityStartsAt: string;
  participantCount: number;
  capacity: number;
}

export type MembershipRequestsResult =
  | { ok: true; requests: MembershipRequestSummary[] }
  | { ok: false; message: string };

export type MembershipRequestsState =
  | { status: 'signedOut'; requests: [] }
  | { status: 'loading'; requests: HostedMembershipRequest[] }
  | { status: 'ready'; requests: HostedMembershipRequest[] }
  | { status: 'error'; requests: HostedMembershipRequest[]; message: string };

export type MyPlansResult =
  | { ok: true; plans: MyPlanSummary[] }
  | { ok: false; message: string };

export type MyPlansState =
  | { status: 'signedOut'; plans: [] }
  | { status: 'loading'; plans: MyPlanSummary[] }
  | { status: 'ready'; plans: MyPlanSummary[] }
  | { status: 'error'; plans: MyPlanSummary[]; message: string };
