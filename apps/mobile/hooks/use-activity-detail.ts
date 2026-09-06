import { useCallback, useEffect, useRef, useState } from 'react';

import { getActivityDetail } from '@/lib/activity-repository';
import type { ActivityDetailState } from '@/types/activity';

const ANONYMOUS_SCOPE = 'anonymous';

export function useActivityDetail(activityId: string, userId: string | null) {
  const accountScope = userId ?? ANONYMOUS_SCOPE;
  const initialState: ActivityDetailState = { status: 'loading', activity: null };
  const [snapshot, setSnapshot] = useState<{
    accountScope: string;
    state: ActivityDetailState;
  }>(() => ({ accountScope, state: initialState }));
  const requestId = useRef(0);

  useEffect(() => {
    requestId.current += 1;
    setSnapshot({ accountScope, state: initialState });
    return () => {
      requestId.current += 1;
    };
  }, [accountScope, activityId]);

  const refresh = useCallback(async () => {
    const activeRequest = ++requestId.current;
    setSnapshot((current) => ({
      accountScope,
      state: {
        activity: current.accountScope === accountScope ? current.state.activity : null,
        status: 'loading',
      },
    }));
    const result = await getActivityDetail(activityId);
    if (activeRequest !== requestId.current) return;

    if (!result.ok) {
      setSnapshot((current) => ({
        accountScope,
        state: {
          activity: current.accountScope === accountScope ? current.state.activity : null,
          message: result.message,
          status: 'error',
        },
      }));
      return;
    }

    setSnapshot({ accountScope, state: { activity: result.activity, status: 'ready' } });
  }, [accountScope, activityId]);

  const redactExactLocation = useCallback(() => {
    requestId.current += 1;
    setSnapshot((current) => {
      if (current.accountScope !== accountScope || !current.state.activity) return current;
      return {
        accountScope,
        state: {
          activity: { ...current.state.activity, exactMeetingLocation: null },
          status: 'ready',
        },
      };
    });

  }, [accountScope]);

  // Account-scoping prevents one signed-in user's private meeting point from
  // painting for even a frame after sign-out or an account switch.
  const state = snapshot.accountScope === accountScope ? snapshot.state : initialState;

  return { redactExactLocation, refresh, state };
}
