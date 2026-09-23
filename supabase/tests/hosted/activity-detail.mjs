#!/usr/bin/env node

/**
 * Black-box hosted checks for activity_detail and cancel_activity.
 *
 * This runner uses only the publishable-key client boundary. It never prints
 * phones, OTPs, tokens, user IDs, activity IDs, or exact coordinates.
 */

const REQUIRED_ENVIRONMENT = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'ACTIVITY_DETAIL_PHONE_A',
  'ACTIVITY_DETAIL_OTP_A',
  'ACTIVITY_DETAIL_PHONE_B',
  'ACTIVITY_DETAIL_OTP_B',
];
const PROFILE_FIELDS =
  'id,display_name,onboarding_status,avatar_config,interests,updated_at';

class VerificationError extends Error {}

function assert(condition, message) {
  if (!condition) throw new VerificationError(message);
}

function requireEnvironment() {
  const missing = REQUIRED_ENVIRONMENT.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new VerificationError(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }

  const phoneA = process.env.ACTIVITY_DETAIL_PHONE_A;
  const phoneB = process.env.ACTIVITY_DETAIL_PHONE_B;
  const otpA = process.env.ACTIVITY_DETAIL_OTP_A;
  const otpB = process.env.ACTIVITY_DETAIL_OTP_B;
  if (![phoneA, phoneB].every((phone) => /^\+[1-9]\d{7,14}$/.test(phone))) {
    throw new VerificationError('Test phones must use E.164 format.');
  }
  if (![otpA, otpB].every((otp) => /^\d{6}$/.test(otp))) {
    throw new VerificationError('Test OTPs must contain exactly six digits.');
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

function mutableProfile(profile) {
  return {
    avatar_config: profile.avatar_config,
    display_name: profile.display_name,
    interests: profile.interests,
    onboarding_status: profile.onboarding_status,
  };
}

function hasExactPoint(detail) {
  return (
    typeof detail.exact_latitude === 'number' &&
    typeof detail.exact_longitude === 'number'
  );
}

function hasNullExactPoint(detail) {
  return detail.exact_latitude === null && detail.exact_longitude === null;
}

async function main() {
  const config = requireEnvironment();
  const failures = [];

  async function request(path, { accessToken, body, method = 'GET', prefer } = {}) {
    const headers = { apikey: config.publishableKey, Accept: 'application/json' };
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

  async function rpc(name, body, accessToken) {
    return request(`/rest/v1/rpc/${name}`, {
      accessToken,
      body,
      method: 'POST',
    });
  }

  async function establishSession(actorLabel, phone, otp) {
    const challenge = await request('/auth/v1/otp', {
      body: { create_user: true, phone },
      method: 'POST',
    });
    assert(challenge.ok, `${actorLabel} OTP request failed (${safeErrorDetails(challenge)}).`);

    const verification = await request('/auth/v1/verify', {
      body: { phone, token: otp, type: 'sms' },
      method: 'POST',
    });
    assert(
      verification.ok,
      `${actorLabel} OTP verification failed (${safeErrorDetails(verification)}).`,
    );
    assert(
      typeof verification.payload?.access_token === 'string' &&
        typeof verification.payload?.user?.id === 'string',
      `${actorLabel} verification returned an invalid session.`,
    );
    return {
      accessToken: verification.payload.access_token,
      userId: verification.payload.user.id,
    };
  }

  function profilePath(userId) {
    return `/rest/v1/profiles?select=${PROFILE_FIELDS}&id=eq.${encodeURIComponent(userId)}`;
  }

  async function readOwnProfile(session) {
    const response = await request(profilePath(session.userId), {
      accessToken: session.accessToken,
    });
    assert(response.ok, `Profile read failed (${safeErrorDetails(response)}).`);
    assert(Array.isArray(response.payload) && response.payload.length === 1, 'Profile read failed.');
    return response.payload[0];
  }

  async function patchOwnProfile(session, body) {
    return request(profilePath(session.userId), {
      accessToken: session.accessToken,
      body,
      method: 'PATCH',
      prefer: 'return=representation',
    });
  }

  async function completeProfile(session, displayName) {
    const response = await patchOwnProfile(session, {
      display_name: displayName,
      onboarding_status: 'complete',
    });
    assert(response.ok, `Profile setup failed (${safeErrorDetails(response)}).`);
  }

  async function createActivity(session) {
    const startsAt = new Date(Date.now() + 6 * 60 * 60 * 1000);
    const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);
    const response = await rpc(
      'create_activity',
      {
        p_capacity: 2,
        p_description: 'Development-only activity-detail acceptance fixture.',
        p_ends_at: endsAt.toISOString(),
        p_join_mode: 'approval',
        p_kind: 'coffee',
        p_private_latitude: 12.9352,
        p_private_longitude: 77.6245,
        p_privacy_radius_m: 350,
        p_starts_at: startsAt.toISOString(),
        p_title: `TEST ACTIVITY DETAIL ${Date.now().toString(36)}`,
      },
      session.accessToken,
    );
    assert(response.ok, `Activity creation failed (${safeErrorDetails(response)}).`);
    assert(
      Array.isArray(response.payload) && typeof response.payload[0]?.id === 'string',
      'Activity creation returned an invalid row.',
    );
    return response.payload[0].id;
  }

  async function detail(activityId, accessToken) {
    const response = await rpc('activity_detail', { p_activity_id: activityId }, accessToken);
    assert(response.ok, `Activity detail failed (${safeErrorDetails(response)}).`);
    assert(Array.isArray(response.payload) && response.payload.length === 1, 'Expected one detail row.');
    return response.payload[0];
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
  let activityId = null;

  try {
    sessionA = await establishSession('Actor A', config.phoneA, config.otpA);
    sessionB = await establishSession('Actor B', config.phoneB, config.otpB);
    assert(sessionA.userId !== sessionB.userId, 'Auth returned the same user for both actors.');
    console.log('PASS two distinct authenticated actors established');

    originalA = await readOwnProfile(sessionA);
    originalB = await readOwnProfile(sessionB);
    await completeProfile(sessionA, 'Activity Detail Harness A');
    await completeProfile(sessionB, 'Activity Detail Harness B');
    activityId = await createActivity(sessionA);
    console.log('PASS active approval fixture created');

    await runTest('missing activity detail returns a stable not-found error', async () => {
      const response = await rpc('activity_detail', {
        p_activity_id: '00000000-0000-0000-0000-000000000000',
      });
      assert(
        !response.ok && response.payload?.code === 'P0002',
        `Missing detail did not return P0002 (${safeErrorDetails(response)}).`,
      );
    });

    await runTest('anonymous detail contains only public-safe fields', async () => {
      const row = await detail(activityId);
      assert(row.status === 'published', 'Anonymous detail has the wrong status.');
      assert(row.membership_role === null, 'Anonymous detail exposed a membership role.');
      assert(row.membership_status === null, 'Anonymous detail exposed a membership status.');
      assert(hasNullExactPoint(row), 'Anonymous detail exposed exact coordinates.');
    });

    await runTest('authenticated non-member receives no membership or exact point', async () => {
      const row = await detail(activityId, sessionB.accessToken);
      assert(row.membership_role === null, 'Non-member detail exposed a membership role.');
      assert(row.membership_status === null, 'Non-member detail exposed a membership status.');
      assert(hasNullExactPoint(row), 'Non-member detail exposed exact coordinates.');
    });

    await runTest('pending member receives status but no exact point', async () => {
      const joined = await rpc(
        'join_activity',
        { p_activity_id: activityId },
        sessionB.accessToken,
      );
      assert(joined.ok, `Join failed (${safeErrorDetails(joined)}).`);
      const row = await detail(activityId, sessionB.accessToken);
      assert(row.membership_role === 'participant', 'Pending detail has the wrong role.');
      assert(row.membership_status === 'pending', 'Pending detail has the wrong status.');
      assert(hasNullExactPoint(row), 'Pending detail exposed exact coordinates.');
    });

    await runTest('accepted participant and host receive the exact active point', async () => {
      const decision = await rpc(
        'decide_activity_request',
        {
          p_activity_id: activityId,
          p_decision: 'approve',
          p_requester_user_id: sessionB.userId,
        },
        sessionA.accessToken,
      );
      assert(decision.ok, `Approval failed (${safeErrorDetails(decision)}).`);
      const [participant, host] = await Promise.all([
        detail(activityId, sessionB.accessToken),
        detail(activityId, sessionA.accessToken),
      ]);
      assert(participant.membership_status === 'accepted', 'Participant is not accepted.');
      assert(participant.membership_role === 'participant', 'Participant role is missing.');
      assert(hasExactPoint(participant), 'Accepted participant lacks the exact point.');
      assert(host.membership_status === 'accepted', 'Host is not accepted.');
      assert(host.membership_role === 'host', 'Host role is missing.');
      assert(hasExactPoint(host), 'Host lacks the exact point.');
    });

    await runTest('non-host and anonymous cancellation are denied', async () => {
      const [anonymous, nonHost] = await Promise.all([
        rpc('cancel_activity', { p_activity_id: activityId }),
        rpc('cancel_activity', { p_activity_id: activityId }, sessionB.accessToken),
      ]);
      assert(
        !anonymous.ok && (anonymous.status === 401 || anonymous.payload?.code === '42501'),
        `Anonymous cancellation was not denied (${safeErrorDetails(anonymous)}).`,
      );
      assert(
        !nonHost.ok && nonHost.payload?.code === '42501',
        `Non-host cancellation was not denied (${safeErrorDetails(nonHost)}).`,
      );
    });

    await runTest('host cancellation is atomic, idempotent, and revokes exact location', async () => {
      const first = await rpc(
        'cancel_activity',
        { p_activity_id: activityId },
        sessionA.accessToken,
      );
      const retry = await rpc(
        'cancel_activity',
        { p_activity_id: activityId },
        sessionA.accessToken,
      );
      assert(first.ok && retry.ok, 'Host cancellation or its retry failed.');
      assert(first.payload?.[0]?.status === 'cancelled', 'First cancellation did not cancel.');
      assert(retry.payload?.[0]?.status === 'cancelled', 'Cancellation retry changed status.');
      assert(
        first.payload[0].activity_id === activityId && retry.payload[0].activity_id === activityId,
        'Cancellation returned the wrong activity.',
      );
      assert(
        first.payload[0].cancelled_at === retry.payload[0].cancelled_at,
        'Cancellation retry changed the durable cancellation time.',
      );
      const [anonymous, participant, host] = await Promise.all([
        detail(activityId),
        detail(activityId, sessionB.accessToken),
        detail(activityId, sessionA.accessToken),
      ]);
      assert(anonymous.status === 'cancelled', 'Public detail did not show cancellation.');
      assert(hasNullExactPoint(anonymous), 'Cancelled public detail exposed exact coordinates.');
      assert(participant.membership_status === 'accepted', 'Participant state was lost.');
      assert(hasNullExactPoint(participant), 'Cancelled participant detail exposed the exact point.');
      assert(host.membership_role === 'host', 'Cancelled host projection lost ownership.');
      assert(hasNullExactPoint(host), 'Cancelled host detail exposed the exact point.');
    });

    await runTest('terminal membership state remains visible without an exact point', async () => {
      const left = await rpc(
        'leave_activity',
        { p_activity_id: activityId },
        sessionB.accessToken,
      );
      assert(left.ok, `Leave after cancellation failed (${safeErrorDetails(left)}).`);
      const row = await detail(activityId, sessionB.accessToken);
      assert(row.membership_role === 'participant', 'Left detail lost the participant role.');
      assert(row.membership_status === 'left', 'Left detail lost the terminal membership state.');
      assert(hasNullExactPoint(row), 'Left detail exposed exact coordinates.');
    });
  } finally {
    if (activityId && sessionA) {
      await rpc('cancel_activity', { p_activity_id: activityId }, sessionA.accessToken);
    }
    const restorations = [];
    if (sessionA && originalA) restorations.push(patchOwnProfile(sessionA, mutableProfile(originalA)));
    if (sessionB && originalB) restorations.push(patchOwnProfile(sessionB, mutableProfile(originalB)));
    if (restorations.length > 0) {
      const results = await Promise.allSettled(restorations);
      if (results.some((result) => result.status === 'rejected' || !result.value.ok)) {
        console.error('FAIL client-writable profile cleanup');
        failures.push('client-writable profile cleanup');
      } else {
        console.log('PASS client-writable profile cleanup');
      }
    }
  }

  if (failures.length > 0) {
    throw new VerificationError(`${failures.length} hosted activity-detail check(s) failed.`);
  }
  console.log('PASS hosted activity-detail verification complete');
}

main().catch((error) => {
  const message =
    error instanceof VerificationError ? error.message : 'Unexpected network or runtime failure.';
  console.error(`FAIL hosted activity-detail verification: ${message}`);
  process.exitCode = 1;
});
