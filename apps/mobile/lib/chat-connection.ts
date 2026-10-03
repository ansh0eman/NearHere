/**
 * Decides how chat recovers when Supabase Realtime is unavailable.
 *
 * This is deliberately independent from React and timers. The screen owns the
 * timer handle; this function makes the transition safe to test and prevents a
 * recovered subscription from leaving a stale timer handle behind.
 */
export type ChatSubscriptionStatus = 'SUBSCRIBED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'CLOSED' | 'unavailable';
export type ChatConnectionState = 'live' | 'polling';

export type ChatConnectionTransition = {
  connection: ChatConnectionState;
  startPolling: boolean;
  stopPolling: boolean;
};

export function resolveChatConnectionTransition(
  status: ChatSubscriptionStatus,
  hasPollingTimer: boolean,
): ChatConnectionTransition {
  if (status === 'SUBSCRIBED') {
    return { connection: 'live', startPolling: false, stopPolling: hasPollingTimer };
  }

  return {
    connection: 'polling',
    startPolling: !hasPollingTimer,
    stopPolling: false,
  };
}
