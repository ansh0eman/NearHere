let sequence = 0;

/** A short client correlation ID for local logs and future server tracing. */
export function createRequestId(operation: string): string {
  sequence += 1;
  return `${operation}-${Date.now().toString(36)}-${sequence.toString(36)}`;
}

/** Logs metadata only; never pass tokens, phone numbers, coordinates, or message bodies. */
export function logClientOperation(requestId: string, operation: string, outcome: 'started' | 'succeeded' | 'failed') {
  if (__DEV__) console.info(`[NearHere ${requestId}] ${operation} ${outcome}`);
}
