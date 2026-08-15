import { useCallback, useEffect, useRef, useState } from 'react';

import { getNearbyActivities } from '@/lib/activity-repository';
import type { ActivityFilter, NearbyActivitiesState } from '@/types/activity';

export function useNearbyActivities(
  latitude: number,
  longitude: number,
  filter: ActivityFilter,
) {
  const [state, setState] = useState<NearbyActivitiesState>({ status: 'loading', activities: [] });
  const requestId = useRef(0);

  const refresh = useCallback(async () => {
    const activeRequest = ++requestId.current;
    setState({ status: 'loading', activities: [] });

    const result = await getNearbyActivities({
      latitude,
      longitude,
      radiusM: 5000,
      kinds: filter === 'all' ? undefined : [filter],
      limit: 50,
    });
    if (activeRequest !== requestId.current) return;

    if (!result.ok) {
      setState((current) => ({ status: 'error', activities: current.activities, message: result.message }));
      return;
    }
    setState({ status: 'ready', activities: result.activities });
  }, [filter, latitude, longitude]);

  useEffect(
    () => () => {
      requestId.current += 1;
    },
    [],
  );

  return { refresh, state };
}
