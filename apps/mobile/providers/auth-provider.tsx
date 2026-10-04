import { Session } from '@supabase/supabase-js';
import { PropsWithChildren, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { parseEmailAuthLink } from '@/lib/auth-link';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import {
  AuthOperationResult,
  AuthStatus,
  ProtectedIntent,
} from '@/types/auth';

type AuthContextValue = {
  isConfigured: boolean;
  pendingIntent: ProtectedIntent | null;
  pendingEmail: string | null;
  pendingPhone: string | null;
  completeEmailLink: (url: string | null | undefined) => Promise<AuthOperationResult>;
  requestEmailMagicLink: (email: string) => Promise<AuthOperationResult>;
  requestOtp: (phone: string) => Promise<AuthOperationResult>;
  retrySessionRestore: () => void;
  restoreErrorMessage: string | null;
  session: Session | null;
  setPendingIntent: (intent: ProtectedIntent | null) => void;
  signOut: () => Promise<AuthOperationResult>;
  status: AuthStatus;
  verifyOtp: (token: string) => Promise<AuthOperationResult>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function unavailableResult(): AuthOperationResult {
  return {
    ok: false,
    message:
      'Authentication is not configured yet. Add the Supabase URL and publishable key, then configure a sign-in provider.',
  };
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>('restoring');
  const [pendingPhone, setPendingPhone] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [pendingIntent, setPendingIntent] = useState<ProtectedIntent | null>(null);
  const [restoreAttempt, setRestoreAttempt] = useState(0);
  const [restoreErrorMessage, setRestoreErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const client = supabase;
    if (!client) {
      setStatus('signedOut');
      return;
    }

    let isActive = true;
    setStatus('restoring');
    setRestoreErrorMessage(null);
    void client.auth.getSession().then(({ data, error }) => {
      if (!isActive) return;
      if (error) {
        setSession(null);
        setRestoreErrorMessage('NearHere could not restore your saved session. Try again.');
        setStatus('restoreError');
        return;
      }
      setSession(data.session);
      setStatus(data.session ? 'signedIn' : 'signedOut');
    });

    const { data } = client.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'INITIAL_SESSION') return;
      setSession(nextSession);
      setRestoreErrorMessage(null);
      setStatus(nextSession ? 'signedIn' : 'signedOut');
    });

    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        client.auth.startAutoRefresh();
      } else {
        client.auth.stopAutoRefresh();
      }
    });

    return () => {
      isActive = false;
      data.subscription.unsubscribe();
      appStateSubscription.remove();
    };
  }, [restoreAttempt]);

  function retrySessionRestore() {
    setRestoreAttempt((attempt) => attempt + 1);
  }

  async function requestOtp(phone: string): Promise<AuthOperationResult> {
    if (!supabase) return unavailableResult();

    setStatus('sendingCode');
    const { error } = await supabase.auth.signInWithOtp({ phone });
    if (error) {
      setStatus('signedOut');
      return { ok: false, message: error.message };
    }

    setPendingPhone(phone);
    setStatus('awaitingCode');
    return { ok: true };
  }

  async function requestEmailMagicLink(email: string): Promise<AuthOperationResult> {
    if (!supabase) return unavailableResult();

    setStatus('sendingEmailLink');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: 'nearhere://auth/callback' },
    });
    if (error) {
      setStatus('signedOut');
      return {
        ok: false,
        message: error.status === 429
          ? 'Too many sign-in links were requested. Please wait before trying again.'
          : 'We could not send a sign-in link. Check the email address and try again.',
      };
    }

    const normalizedEmail = email.trim().toLowerCase();
    setPendingEmail(normalizedEmail);
    setStatus('awaitingEmailLink');
    return { ok: true };
  }

  async function completeEmailLink(url: string | null | undefined): Promise<AuthOperationResult> {
    if (!supabase) return unavailableResult();

    const link = parseEmailAuthLink(url);
    if (link.kind === 'ignored') return { ok: false, message: 'This is not a NearHere sign-in link.' };
    if (link.kind === 'error') {
      setPendingEmail(null);
      setStatus(session ? 'signedIn' : 'signedOut');
      return { ok: false, message: link.message };
    }

    setStatus('exchangingEmailLink');
    const { data, error } = await supabase.auth.exchangeCodeForSession(link.code);
    if (error || !data.session) {
      setPendingEmail(null);
      setStatus(session ? 'signedIn' : 'signedOut');
      return {
        ok: false,
        message: 'This sign-in link could not be completed. It may have expired or been opened on a different device. Request a new link on this device.',
      };
    }

    setSession(data.session);
    setPendingEmail(null);
    setStatus('signedIn');
    return { ok: true };
  }

  async function verifyOtp(token: string): Promise<AuthOperationResult> {
    if (!supabase || !pendingPhone) {
      return {
        ok: false,
        message: 'The phone verification request is missing. Request a new code.',
      };
    }

    setStatus('verifyingCode');
    const { data, error } = await supabase.auth.verifyOtp({
      phone: pendingPhone,
      token,
      type: 'sms',
    });

    if (error) {
      setStatus('awaitingCode');
      return { ok: false, message: error.message };
    }

    setSession(data.session);
    setPendingPhone(null);
    setStatus('signedIn');
    return { ok: true };
  }

  async function signOut(): Promise<AuthOperationResult> {
    if (!supabase) return unavailableResult();

    const { error } = await supabase.auth.signOut();
    if (error) return { ok: false, message: error.message };

    setSession(null);
    setPendingIntent(null);
    setPendingEmail(null);
    setPendingPhone(null);
    setStatus('signedOut');
    return { ok: true };
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      isConfigured: isSupabaseConfigured,
      pendingIntent,
      pendingEmail,
      pendingPhone,
      completeEmailLink,
      requestEmailMagicLink,
      requestOtp,
      retrySessionRestore,
      restoreErrorMessage,
      session,
      setPendingIntent,
      signOut,
      status,
      verifyOtp,
    }),
    // Functions intentionally close over current auth state and are refreshed with the context value.
    [pendingEmail, pendingIntent, pendingPhone, restoreErrorMessage, session, status],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
