export type ActivityPublishAttempt = {
  fingerprint: string;
  requestId: string;
};

/**
 * Keeps one idempotency key for retries of the same Host draft. A changed draft
 * gets a new key, so the database can reject accidental key reuse safely.
 */
export function resolveActivityPublishAttempt(
  previous: ActivityPublishAttempt | null,
  fingerprint: string,
  createRequestId: () => string,
): ActivityPublishAttempt {
  if (previous?.fingerprint === fingerprint) return previous;
  return { fingerprint, requestId: createRequestId() };
}
