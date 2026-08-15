export type AuthStatus =
  | 'restoring'
  | 'restoreError'
  | 'signedOut'
  | 'sendingCode'
  | 'awaitingCode'
  | 'verifyingCode'
  | 'signedIn';

export type ProtectedIntent =
  | { kind: 'joinActivity'; activityId: string }
  | { kind: 'hostActivity' }
  | { kind: 'openAccount' };

export type AuthOperationResult =
  | { ok: true }
  | { ok: false; message: string };
