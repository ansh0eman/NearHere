export type AuthStatus =
  | 'restoring'
  | 'restoreError'
  | 'signedOut'
  | 'sendingCode'
  | 'awaitingCode'
  | 'verifyingCode'
  | 'sendingEmailLink'
  | 'awaitingEmailLink'
  | 'exchangingEmailLink'
  | 'signedIn';

export type ProtectedIntent =
  | { kind: 'joinActivity'; activityId: string; returnToActivity?: boolean }
  | { kind: 'hostActivity' }
  | { kind: 'openPlans' }
  | { kind: 'openAccount' };

export type AuthOperationResult =
  | { ok: true }
  | { ok: false; message: string };
