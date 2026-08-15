import { useCallback, useEffect, useRef, useState } from 'react';

import { getMyPlans } from '@/lib/activity-repository';
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

  useEffect(() => {
    requestId.current += 1;
    setSnapshot({
      state: userId ? { status: 'loading', plans: [] } : { status: 'signedOut', plans: [] },
      userId,
    });

    return () => {
      requestId.current += 1;
    };
  }, [userId]);

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
    setSnapshot({ state: { status: 'ready', plans: result.plans }, userId });
  }, [userId]);

  // Effects clear durable state after a render. This synchronous gate prevents
  // the previous account's cached exact locations from painting for one frame.
  const state = snapshot.userId === userId ? snapshot.state : initialState;

  return { refresh, state };
}
