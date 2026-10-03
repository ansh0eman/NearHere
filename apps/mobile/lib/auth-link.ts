export type EmailAuthLink =
  | { kind: 'code'; code: string }
  | { kind: 'error'; message: string }
  | { kind: 'ignored' };

/**
 * Parses only NearHere's expected passwordless-auth callback. Keeping this pure
 * makes the native deep-link boundary testable without a Supabase client.
 */
export function parseEmailAuthLink(rawUrl: string | null | undefined): EmailAuthLink {
  if (!rawUrl) return { kind: 'ignored' };

  try {
    const url = new URL(rawUrl);
    if (url.protocol !== 'nearhere:' || url.hostname !== 'auth' || url.pathname !== '/callback') {
      return { kind: 'ignored' };
    }

    const providerError = url.searchParams.get('error_description') ?? url.searchParams.get('error');
    if (providerError) return { kind: 'error', message: providerError };

    const code = url.searchParams.get('code');
    return code ? { kind: 'code', code } : { kind: 'error', message: 'The sign-in link is incomplete. Request a new one.' };
  } catch {
    return { kind: 'ignored' };
  }
}
