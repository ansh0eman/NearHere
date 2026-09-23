import { useCallback, useEffect, useRef, useState } from 'react';

import { decideMembershipRequest, getMembershipRequests } from '@/lib/activity-repository';
import type {
  MembershipRequestDecision,
  MembershipRequestsState,
  MyPlanSummary,
} from '@/types/activity';

export function useMembershipRequests(userId: string | null, plans: MyPlanSummary[]) {
  const initialState: MembershipRequestsState = userId
    ? { status: 'loading', requests: [] }
    : { status: 'signedOut', requests: [] };
  const [snapshot, setSnapshot] = useState<{
    userId: string | null;
    state: MembershipRequestsState;
  }>(() => ({ state: initialState, userId }));
  const [decidingKey, setDecidingKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const decidingKeyRef = useRef<string | null>(null);
  const requestId = useRef(0);
  const plansRef = useRef(plans);
  plansRef.current = plans;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;
  const hostedPlansFingerprint = plans
    .filter((plan) => plan.membershipRole === 'host')
    .map((plan) => `${plan.id}:${plan.status}:${plan.endsAt}:${plan.participantCount}`)
    .join('|');

  useEffect(() => {
    requestId.current += 1;
    setActionError(null);
    setActionNotice(null);
    setDecidingKey(null);
    decidingKeyRef.current = null;
    setSnapshot({
      state: userId ? { status: 'loading', requests: [] } : { status: 'signedOut', requests: [] },
      userId,
    });
    return () => { requestId.current += 1; };
  }, [userId]);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const activeRequest = ++requestId.current;
    setSnapshot((current) => ({
      state: {
        status: 'loading',
        requests: current.userId === userId ? current.state.requests : [],
      },
      userId,
    }));
    const hostedPlans = plansRef.current.filter((plan) => plan.membershipRole === 'host'
      && plan.status === 'published'
      && Date.parse(plan.endsAt) > Date.now());
    const results = await Promise.all(hostedPlans.map(async (plan) => ({
      plan,
      result: await getMembershipRequests(plan.id),
    })));
    if (activeRequest !== requestId.current) return;
    const failedResult = results.map(({ result }) => result).find((result) => !result.ok);
    if (failedResult && !failedResult.ok) {
      setSnapshot((current) => ({
        state: {
          status: 'error',
          requests: current.userId === userId ? current.state.requests : [],
          message: failedResult.message,
        },
        userId,
      }));
      return;
    }
    setSnapshot({
      state: {
        status: 'ready',
        requests: results.flatMap(({ plan, result }) => result.ok
          ? result.requests.map((request) => ({
            ...request,
            activityId: plan.id,
            activityTitle: plan.title,
            activityStartsAt: plan.startsAt,
            participantCount: plan.participantCount,
            capacity: plan.capacity,
          }))
          : []),
      },
      userId,
    });
  }, [userId]);

  useEffect(() => {
    if (userId) void refresh();
  }, [hostedPlansFingerprint, refresh, userId]);

  const decide = useCallback(async (
    activityId: string,
    requesterUserId: string,
    decision: MembershipRequestDecision,
  ) => {
    if (!userId || decidingKeyRef.current) return false;
    const key = `${activityId}:${requesterUserId}`;
    // A read that started before this decision must not resurrect the pending
    // request after the mutation succeeds.
    requestId.current += 1;
    setActionError(null);
    setActionNotice(null);
    setDecidingKey(key);
    decidingKeyRef.current = key;
    const result = await decideMembershipRequest({ activityId, requesterUserId, decision });
    if (userIdRef.current !== userId) return false;
    setDecidingKey(null);
    decidingKeyRef.current = null;
    if (!result.ok) {
      setActionError(result.message);
      return false;
    }
    setActionNotice(
      result.result.membershipStatus === 'accepted'
        ? 'Request accepted.'
        : result.result.membershipStatus === 'waitlisted'
          ? 'The activity is full, so this person moved to the waitlist.'
          : 'Request declined.',
    );
    // Also invalidate any read that began while the mutation was in flight.
    requestId.current += 1;
    setSnapshot((current) => ({
      ...current,
      state: {
        status: 'ready',
        requests: current.state.requests.filter(
          (request) => request.activityId !== activityId
            || request.requesterUserId !== requesterUserId,
        ),
      },
    }));
    void refresh();
    return true;
  }, [refresh, userId]);

  const state = snapshot.userId === userId ? snapshot.state : initialState;
  return { actionError, actionNotice, decide, decidingKey, refresh, state };
}
