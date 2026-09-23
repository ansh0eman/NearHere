/**
 * A safe, user-facing failure contract. `message` may be rendered; `code` is
 * stable enough for tests/metrics; `requestId` is correlation metadata only.
 */
export type AppErrorCode =
  | 'configuration_unavailable'
  | 'forbidden'
  | 'not_found'
  | 'rate_limited'
  | 'invalid_response'
  | 'network_failure'
  | 'unknown_failure';

export interface AppError {
  code: AppErrorCode;
  message: string;
  requestId?: string;
  retryable: boolean;
}

/** Do not pass provider errors, tokens, phone numbers, coordinates, or bodies. */
export function appFailure(
  code: AppErrorCode,
  message: string,
  retryable: boolean,
  requestId?: string,
): { ok: false; message: string; error: AppError } {
  return { ok: false, message, error: { code, message, requestId, retryable } };
}
