import { useCallback, useEffect, useRef, useState } from 'react';

import { getMyPlans, leaveActivity } from '@/lib/activity-repository';
import type { MyPlansState } from '@/types/activity';

export function useMyPlans(userId: string | null) {
  const initialState: MyPlansState = userId
    ? { status: 'loading', plans: [] }
    : { status: 'signedOut', plans: [] };
  const [snapshot, setSnapshot] = useState<{ userId: string | null; state: MyPlansState }>(() => ({
    state: initialState,
    userId,
  }));
  const requestId = useRef(0);
  const [leavingActivityId, setLeavingActivityId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const leavingActivityIdRef = useRef<string | null>(null);
  const userIdRef = useRef(userId);
  userIdRef.current = userId;
  const refreshRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    requestId.current += 1;
    setActionError(null);
    setActionNotice(null);
    setLeavingActivityId(null);
    leavingActivityIdRef.current = null;
    setSnapshot({
      state: userId ? { status: 'loading', plans: [] } : { status: 'signedOut', plans: [] },
      userId,
    });

    return () => {
      requestId.current += 1;
    };
  }, [userId]);

  const leave = useCallback(async (activityId: string) => {
    if (!userId || leavingActivityIdRef.current) return false;

    const removedIndex = snapshot.state.plans.findIndex((plan) => plan.id === activityId);
    const removedPlan = snapshot.state.plans[removedIndex];
    // Invalidate any read that began before Leave. Otherwise it could resolve
    // after this optimistic update and briefly repaint an exact meeting point.
    requestId.current += 1;
    leavingActivityIdRef.current = activityId;
    setActionError(null);
    setActionNotice(null);
    setLeavingActivityId(activityId);
    // Removing the plan before the request begins is a privacy boundary: an
    // exact meeting point cannot remain visible after the person chooses Leave.
    setSnapshot((current) => ({
      ...current,
      state: {
        status: 'ready',
        plans: current.state.plans.filter((plan) => plan.id !== activityId),
      },
    }));

    const result = await leaveActivity(activityId);
    if (userIdRef.current !== userId) return false;
    setLeavingActivityId(null);
    leavingActivityIdRef.current = null;
    if (!result.ok) {
      setSnapshot((current) => {
        if (current.userId !== userId || !removedPlan
          || current.state.plans.some((plan) => plan.id === activityId)) return current;
        const plans = [...current.state.plans];
        plans.splice(Math.min(removedIndex, plans.length), 0, removedPlan);
        return { state: { status: 'ready', plans }, userId };
      });
      setActionError(result.message);
      return false;
    }
    setActionNotice(result.result.waitlistPromoted
      ? 'You left. The next person on the waitlist was added automatically.'
      : removedPlan?.membershipStatus === 'pending'
        ? 'Your join request was withdrawn.'
        : removedPlan?.membershipStatus === 'waitlisted'
          ? 'You left the waitlist.'
          : 'You left the activity. Private meeting access was removed.');
    void refreshRef.current?.();
    return true;
  }, [snapshot, userId]);

  const refresh = useCallback(async () => {
    if (!userId) {
      requestId.current += 1;
      setSnapshot({ state: { status: 'signedOut', plans: [] }, userId: null });
      return;
    }

    const activeRequest = ++requestId.current;
    setSnapshot((current) => ({
      state: {
        status: 'loading',
        plans: current.userId === userId ? current.state.plans : [],
      },
      userId,
    }));
    const result = await getMyPlans();
    if (activeRequest !== requestId.current) return;

    if (!result.ok) {
      setSnapshot((current) => ({
        state: {
          status: 'error',
          plans: current.userId === userId ? current.state.plans : [],
          message: result.message,
        },
        userId,
      }));
      return;
    }
    setSnapshot({
      state: {
        status: 'ready',
        plans: leavingActivityIdRef.current
          ? result.plans.filter((plan) => plan.id !== leavingActivityIdRef.current)
          : result.plans,
      },
      userId,
    });
  }, [userId]);
  refreshRef.current = refresh;

  // Effects clear durable state after a render. This synchronous gate prevents
  // the previous account's cached exact locations from painting for one frame.
  const state = snapshot.userId === userId ? snapshot.state : initialState;

  return { actionError, actionNotice, leave, leavingActivityId, refresh, state };
}
