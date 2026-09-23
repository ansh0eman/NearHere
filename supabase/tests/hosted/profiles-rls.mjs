#!/usr/bin/env node

/**
 * Black-box verification for the hosted profiles table.
 *
 * This intentionally uses only Node's built-in fetch. Auth responses and
 * bearer tokens remain in memory and are never written to stdout or disk.
 */

const REQUIRED_ENVIRONMENT = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'PROFILE_RLS_PHONE_A',
  'PROFILE_RLS_OTP_A',
  'PROFILE_RLS_PHONE_B',
  'PROFILE_RLS_OTP_B',
];

const PROFILE_FIELDS =
  'id,display_name,onboarding_status,avatar_config,interests,updated_at';

class VerificationError extends Error {}

function requireEnvironment() {
  const missing = REQUIRED_ENVIRONMENT.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new VerificationError(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }

  const phoneA = process.env.PROFILE_RLS_PHONE_A;
  const phoneB = process.env.PROFILE_RLS_PHONE_B;
  const otpA = process.env.PROFILE_RLS_OTP_A;
  const otpB = process.env.PROFILE_RLS_OTP_B;

  if (!/^\+[1-9]\d{7,14}$/.test(phoneA) || !/^\+[1-9]\d{7,14}$/.test(phoneB)) {
    throw new VerificationError(
      'Both test phones must use E.164 format with a leading plus sign.',
    );
  }
  if (!/^\d{6}$/.test(otpA) || !/^\d{6}$/.test(otpB)) {
    throw new VerificationError('Both test OTPs must contain exactly six digits.');
  }
  if (phoneA === phoneB) {
    throw new VerificationError('The two test actors must use different phone numbers.');
  }

  return {
    otpA,
    otpB,
    phoneA,
    phoneB,
    publishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL.replace(/\/$/, ''),
  };
}

function safeErrorDetails(response) {
  const code =
    response.payload && typeof response.payload.code === 'string'
      ? response.payload.code
      : 'no-code';
  return `HTTP ${response.status}, code ${code}`;
}

function assert(condition, message) {
  if (!condition) throw new VerificationError(message);
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function mutableProfile(profile) {
  return {
    avatar_config: profile.avatar_config,
    display_name: profile.display_name,
    interests: profile.interests,
    onboarding_status: profile.onboarding_status,
  };
}

async function main() {
  const config = requireEnvironment();
  const failures = [];

  async function request(path, { accessToken, body, method = 'GET', prefer } = {}) {
    const headers = {
      apikey: config.publishableKey,
      Accept: 'application/json',
    };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (prefer) headers.Prefer = prefer;

    const response = await fetch(`${config.supabaseUrl}${path}`, {
      body: body === undefined ? undefined : JSON.stringify(body),
      headers,
      method,
    });
    const text = await response.text();
    let payload = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = null;
      }
    }

    return { ok: response.ok, payload, status: response.status };
  }

  async function establishSession(actorLabel, phone, otp) {
    const otpResponse = await request('/auth/v1/otp', {
      body: { create_user: true, phone },
      method: 'POST',
    });
    assert(
      otpResponse.ok,
      `${actorLabel} OTP request failed (${safeErrorDetails(otpResponse)}).`,
    );

    const verifyResponse = await request('/auth/v1/verify', {
      body: { phone, token: otp, type: 'sms' },
      method: 'POST',
    });
    assert(
      verifyResponse.ok,
      `${actorLabel} OTP verification failed (${safeErrorDetails(verifyResponse)}).`,
    );
    assert(
      verifyResponse.payload &&
        typeof verifyResponse.payload.access_token === 'string' &&
        typeof verifyResponse.payload.user?.id === 'string',
      `${actorLabel} verification did not return the expected session shape.`,
    );

    return {
      accessToken: verifyResponse.payload.access_token,
      userId: verifyResponse.payload.user.id,
    };
  }

  function profilePath(userId, fields = PROFILE_FIELDS) {
    return `/rest/v1/profiles?select=${fields}&id=eq.${encodeURIComponent(userId)}`;
  }

  async function readOwnProfile(session) {
    const response = await request(profilePath(session.userId), {
      accessToken: session.accessToken,
    });
    assert(response.ok, `Owner profile read failed (${safeErrorDetails(response)}).`);
    assert(
      Array.isArray(response.payload) && response.payload.length === 1,
      'Owner profile read must return exactly one row.',
    );
    return response.payload[0];
  }

  async function patchProfile(session, targetId, body) {
    return request(profilePath(targetId), {
      accessToken: session.accessToken,
      body,
      method: 'PATCH',
      prefer: 'return=representation',
    });
  }

  async function runTest(name, operation) {
    try {
      await operation();
      console.log(`PASS ${name}`);
    } catch (error) {
      const message =
        error instanceof VerificationError
          ? error.message
          : 'Unexpected network or runtime failure.';
      console.error(`FAIL ${name}: ${message}`);
      failures.push(name);
    }
  }

  let sessionA = null;
  let sessionB = null;
  let originalA = null;
  let originalB = null;
  let changedA = null;

  try {
    sessionA = await establishSession('Actor A', config.phoneA, config.otpA);
    sessionB = await establishSession('Actor B', config.phoneB, config.otpB);
    assert(sessionA.userId !== sessionB.userId, 'Auth returned the same user for both actors.');
    console.log('PASS two distinct authenticated actors established');

    originalA = await readOwnProfile(sessionA);
    originalB = await readOwnProfile(sessionB);
    console.log('PASS signup trigger created exactly one profile per actor');

    await runTest('anonymous profile reads are denied', async () => {
      const response = await request('/rest/v1/profiles?select=id&limit=1');
      assert(
        !response.ok && response.payload?.code === '42501',
        `Expected PostgreSQL permission denial (${safeErrorDetails(response)}).`,
      );
    });

    await runTest('each owner can read exactly one own profile', async () => {
      await readOwnProfile(sessionA);
      await readOwnProfile(sessionB);
    });

    await runTest('authenticated users cannot read another profile', async () => {
      const [aReadsB, bReadsA] = await Promise.all([
        request(profilePath(sessionB.userId, 'id'), { accessToken: sessionA.accessToken }),
        request(profilePath(sessionA.userId, 'id'), { accessToken: sessionB.accessToken }),
      ]);
      for (const response of [aReadsB, bReadsA]) {
        assert(response.ok, `Cross-user read failed unexpectedly (${safeErrorDetails(response)}).`);
        assert(
          Array.isArray(response.payload) && response.payload.length === 0,
          'RLS must filter the other actor row to an empty result.',
        );
      }
    });

    await runTest('owner can update allowed fields and updated_at is server-maintained', async () => {
      const response = await patchProfile(sessionA, sessionA.userId, {
        avatar_config: { source: 'hosted-rls-harness', version: 1 },
        display_name: 'RLS Harness A',
        interests: ['integration-testing'],
        onboarding_status: 'complete',
      });
      assert(response.ok, `Allowed owner update failed (${safeErrorDetails(response)}).`);
      assert(
        Array.isArray(response.payload) && response.payload.length === 1,
        'Allowed owner update must return exactly one row.',
      );
      changedA = response.payload[0];
      assert(
        changedA.updated_at !== originalA.updated_at,
        'The database did not advance the server-owned updated_at value.',
      );
    });

    await runTest('authenticated user cannot update another profile', async () => {
      const response = await patchProfile(sessionA, sessionB.userId, {
        display_name: 'Unauthorized Change',
      });
      assert(response.ok, `Cross-user update failed unexpectedly (${safeErrorDetails(response)}).`);
      assert(
        Array.isArray(response.payload) && response.payload.length === 0,
        'RLS must make the cross-user update affect zero rows.',
      );
      const currentB = await readOwnProfile(sessionB);
      assert(
        sameJson(mutableProfile(currentB), mutableProfile(originalB)),
        'The other actor profile changed despite the RLS policy.',
      );
    });

    await runTest('client cannot update protected profile columns', async () => {
      const response = await patchProfile(sessionA, sessionA.userId, {
        updated_at: '2000-01-01T00:00:00Z',
      });
      assert(
        !response.ok && response.payload?.code === '42501',
        `Expected a column-permission denial (${safeErrorDetails(response)}).`,
      );
    });

    await runTest('authenticated clients cannot insert profiles', async () => {
      const response = await request('/rest/v1/profiles', {
        accessToken: sessionA.accessToken,
        body: { id: sessionA.userId },
        method: 'POST',
        prefer: 'return=representation',
      });
      assert(
        !response.ok && response.payload?.code === '42501',
        `Expected an insert-permission denial (${safeErrorDetails(response)}).`,
      );
    });

    await runTest('authenticated clients cannot delete profiles', async () => {
      const response = await request(profilePath(sessionA.userId, 'id'), {
        accessToken: sessionA.accessToken,
        method: 'DELETE',
        prefer: 'return=representation',
      });
      assert(
        !response.ok && response.payload?.code === '42501',
        `Expected a delete-permission denial (${safeErrorDetails(response)}).`,
      );
    });

    const invalidUpdates = [
      ['one-character display name', { display_name: 'x' }],
      ['non-object avatar configuration', { avatar_config: [] }],
      ['more than twenty interests', { interests: Array.from({ length: 21 }, (_, i) => `i${i}`) }],
    ];
    for (const [label, body] of invalidUpdates) {
      await runTest(`constraint rejects ${label}`, async () => {
        const response = await patchProfile(sessionA, sessionA.userId, body);
        assert(
          !response.ok && response.payload?.code === '23514',
          `Expected a check-constraint failure (${safeErrorDetails(response)}).`,
        );
        const currentA = await readOwnProfile(sessionA);
        assert(
          changedA && sameJson(mutableProfile(currentA), mutableProfile(changedA)),
          'A rejected update changed client-writable profile state.',
        );
      });
    }
  } finally {
    const restorations = [];
    if (sessionA && originalA) {
      restorations.push(
        patchProfile(sessionA, sessionA.userId, mutableProfile(originalA)).then((response) => {
          assert(response.ok, `Actor A cleanup failed (${safeErrorDetails(response)}).`);
          assert(
            Array.isArray(response.payload) && response.payload.length === 1,
            'Actor A cleanup did not restore exactly one row.',
          );
        }),
      );
    }
    if (sessionB && originalB) {
      restorations.push(
        patchProfile(sessionB, sessionB.userId, mutableProfile(originalB)).then((response) => {
          assert(response.ok, `Actor B cleanup failed (${safeErrorDetails(response)}).`);
          assert(
            Array.isArray(response.payload) && response.payload.length === 1,
            'Actor B cleanup did not restore exactly one row.',
          );
        }),
      );
    }

    if (restorations.length > 0) {
      const results = await Promise.allSettled(restorations);
      const cleanupFailed = results.some((result) => result.status === 'rejected');
      if (cleanupFailed) {
        console.error('FAIL client-writable profile cleanup');
        failures.push('client-writable profile cleanup');
      } else {
        console.log('PASS client-writable profile cleanup');
      }
    }

    sessionA = null;
    sessionB = null;
  }

  if (failures.length > 0) {
    throw new VerificationError(`${failures.length} hosted profile verification check(s) failed.`);
  }

  console.log('PASS hosted profile RLS verification complete');
}

main().catch((error) => {
  const message =
    error instanceof VerificationError
      ? error.message
      : 'Unexpected network or runtime failure.';
  console.error(`Verification stopped: ${message}`);
  process.exitCode = 1;
});
