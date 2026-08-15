#!/usr/bin/env node

/**
 * Black-box acceptance checks for hosted activity participation.
 *
 * The runner deliberately uses only the publishable client boundary and
 * Node's built-in fetch. Phones, OTPs, sessions, and response bodies from Auth
 * never leave process memory. It creates clearly labelled development data.
 */

const REQUIRED_ENVIRONMENT = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'PARTICIPATION_PHONE_A',
  'PARTICIPATION_OTP_A',
  'PARTICIPATION_PHONE_B',
  'PARTICIPATION_OTP_B',
];

const PROFILE_FIELDS =
  'id,display_name,onboarding_status,avatar_config,interests,updated_at';
const EXACT_FIELDS = ['exact_latitude', 'exact_longitude'];

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

  const phoneA = process.env.PARTICIPATION_PHONE_A;
  const phoneB = process.env.PARTICIPATION_PHONE_B;
  const otpA = process.env.PARTICIPATION_OTP_A;
  const otpB = process.env.PARTICIPATION_OTP_B;

  function optionalActor(suffix) {
    const phone = process.env[`PARTICIPATION_PHONE_${suffix}`];
    const otp = process.env[`PARTICIPATION_OTP_${suffix}`];
    if (Boolean(phone) !== Boolean(otp)) {
      throw new VerificationError(
        `PARTICIPATION_PHONE_${suffix} and PARTICIPATION_OTP_${suffix} must be supplied together.`,
      );
    }
    return phone && otp ? { otp, phone } : null;
  }

  const actorC = optionalActor('C');
  const actorD = optionalActor('D');
  if (actorD && !actorC) {
    throw new VerificationError('Actor D requires Actor C to be configured.');
  }

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

  for (const [label, actor] of [
    ['C', actorC],
    ['D', actorD],
  ]) {
    if (actor && !/^\+[1-9]\d{7,14}$/.test(actor.phone)) {
      throw new VerificationError(`Test phone ${label} must use E.164 format.`);
    }
    if (actor && !/^\d{6}$/.test(actor.otp)) {
      throw new VerificationError(`Test OTP ${label} must contain exactly six digits.`);
    }
  }

  const phones = [phoneA, phoneB, actorC?.phone, actorD?.phone].filter(Boolean);
  if (new Set(phones).size !== phones.length) {
    throw new VerificationError('Every configured test actor needs a distinct phone number.');
  }

  return {
    actorC,
    actorD,
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

function hasExactPoint(plan) {
  return EXACT_FIELDS.every((field) => typeof plan[field] === 'number');
}

function hasNullExactPoint(plan) {
  return EXACT_FIELDS.every((field) => plan[field] === null);
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
    assert(
      challenge.ok,
      `${actorLabel} OTP request failed (${safeErrorDetails(challenge)}).`,
    );

    const verification = await request('/auth/v1/verify', {
      body: { phone, token: otp, type: 'sms' },
      method: 'POST',
    });
    assert(
      verification.ok,
      `${actorLabel} OTP verification failed (${safeErrorDetails(verification)}).`,
    );
    assert(
      verification.payload &&
        typeof verification.payload.access_token === 'string' &&
        typeof verification.payload.user?.id === 'string',
      `${actorLabel} verification did not return the expected session shape.`,
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
    assert(
      Array.isArray(response.payload) && response.payload.length === 1,
      'Profile read must return exactly one row.',
    );
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
    assert(
      Array.isArray(response.payload) && response.payload.length === 1,
      'Profile setup must update exactly one row.',
    );
  }

  async function createActivity(session, joinMode, label) {
    const startsAt = new Date(Date.now() + 6 * 60 * 60 * 1000);
    const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);
    const response = await rpc(
      'create_activity',
      {
        p_capacity: 2,
        p_description:
          'Development-only activity created by the hosted participation harness.',
        p_ends_at: endsAt.toISOString(),
        p_join_mode: joinMode,
        p_kind: 'walk',
        p_private_latitude: 12.9352,
        p_private_longitude: 77.6245,
        p_privacy_radius_m: 350,
        p_starts_at: startsAt.toISOString(),
        p_title: `TEST ${label} ${Date.now().toString(36)}`,
      },
      session.accessToken,
    );
    assert(response.ok, `Activity creation failed (${safeErrorDetails(response)}).`);
    assert(
      Array.isArray(response.payload) &&
        response.payload.length === 1 &&
        typeof response.payload[0]?.id === 'string',
      'Activity creation must return exactly one activity.',
    );
    return response.payload[0].id;
  }

  async function join(session, activityId) {
    const response = await rpc(
      'join_activity',
      { p_activity_id: activityId },
      session.accessToken,
    );
    assert(response.ok, `Join failed (${safeErrorDetails(response)}).`);
    assert(
      Array.isArray(response.payload) && response.payload.length === 1,
      'Join must return exactly one outcome.',
    );
    return response.payload[0];
  }

  async function plans(session) {
    const response = await rpc('my_plans', { p_limit: 100 }, session.accessToken);
    assert(response.ok, `Plans read failed (${safeErrorDetails(response)}).`);
    assert(Array.isArray(response.payload), 'Plans must return a list.');
    return response.payload;
  }

  async function leave(session, activityId) {
    const response = await rpc(
      'leave_activity',
      { p_activity_id: activityId },
      session.accessToken,
    );
    assert(response.ok, `Leave failed (${safeErrorDetails(response)}).`);
    assert(
      Array.isArray(response.payload) && response.payload.length === 1,
      'Leave must return exactly one outcome.',
    );
    return response.payload[0];
  }

  async function decide(hostSession, activityId, participantId, decision) {
    const response = await rpc(
      'decide_activity_request',
      {
        p_activity_id: activityId,
        p_decision: decision,
        p_requester_user_id: participantId,
      },
      hostSession.accessToken,
    );
    assert(response.ok, `Host decision failed (${safeErrorDetails(response)}).`);
    assert(
      Array.isArray(response.payload) && response.payload.length === 1,
      'Host decision must return exactly one outcome.',
    );
    return response.payload[0];
  }

  async function pendingRequests(hostSession, activityId) {
    const response = await rpc(
      'host_pending_activity_requests',
      { p_activity_id: activityId, p_limit: 50 },
      hostSession.accessToken,
    );
    assert(response.ok, `Pending-request read failed (${safeErrorDetails(response)}).`);
    assert(Array.isArray(response.payload), 'Pending requests must return a list.');
    return response.payload;
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
  let sessionC = null;
  let sessionD = null;
  let originalA = null;
  let originalB = null;
  let originalC = null;
  let originalD = null;

  try {
    sessionA = await establishSession('Actor A', config.phoneA, config.otpA);
    sessionB = await establishSession('Actor B', config.phoneB, config.otpB);
    assert(sessionA.userId !== sessionB.userId, 'Auth returned the same user for both actors.');
    console.log('PASS two distinct authenticated actors established');

    originalA = await readOwnProfile(sessionA);
    originalB = await readOwnProfile(sessionB);
    await completeProfile(sessionA, 'Participation Harness A');
    await completeProfile(sessionB, 'Participation Harness B');
    console.log('PASS both actors have completed profiles');

    if (config.actorC) {
      sessionC = await establishSession('Actor C', config.actorC.phone, config.actorC.otp);
      originalC = await readOwnProfile(sessionC);
      await completeProfile(sessionC, 'Participation Harness C');
      assert(
        ![sessionA.userId, sessionB.userId].includes(sessionC.userId),
        'Auth returned a duplicate user for Actor C.',
      );
      console.log('PASS optional Actor C established');
    }
    if (config.actorD) {
      sessionD = await establishSession('Actor D', config.actorD.phone, config.actorD.otp);
      originalD = await readOwnProfile(sessionD);
      await completeProfile(sessionD, 'Participation Harness D');
      assert(
        ![sessionA.userId, sessionB.userId, sessionC.userId].includes(sessionD.userId),
        'Auth returned a duplicate user for Actor D.',
      );
      console.log('PASS optional Actor D established');
    }

    await runTest('anonymous participation commands are denied', async () => {
      const unavailableId = '00000000-0000-0000-0000-000000000000';
      const responses = await Promise.all([
        rpc('join_activity', { p_activity_id: unavailableId }),
        rpc('leave_activity', { p_activity_id: unavailableId }),
        rpc('decide_activity_request', {
          p_activity_id: unavailableId,
          p_decision: 'approve',
          p_requester_user_id: unavailableId,
        }),
        rpc('host_pending_activity_requests', {
          p_activity_id: unavailableId,
          p_limit: 1,
        }),
        rpc('my_plans', { p_limit: 1 }),
      ]);
      for (const response of responses) {
        assert(
          !response.ok && (response.status === 401 || response.payload?.code === '42501'),
          `Expected anonymous denial (${safeErrorDetails(response)}).`,
        );
      }
    });

    const actorAOnlyId = await createActivity(sessionA, 'open', 'CALLER A ONLY');
    const actorBOnlyId = await createActivity(sessionB, 'open', 'CALLER B ONLY');
    await runTest('Plans is caller-scoped for host-only activities', async () => {
      const [plansA, plansB] = await Promise.all([plans(sessionA), plans(sessionB)]);
      assert(plansA.some((plan) => plan.id === actorAOnlyId), 'Actor A cannot see own plan.');
      assert(!plansA.some((plan) => plan.id === actorBOnlyId), 'Actor A can see Actor B-only plan.');
      assert(plansB.some((plan) => plan.id === actorBOnlyId), 'Actor B cannot see own plan.');
      assert(!plansB.some((plan) => plan.id === actorAOnlyId), 'Actor B can see Actor A-only plan.');
    });

    const openId = actorAOnlyId;
    await runTest('open Join accepts once and retries idempotently', async () => {
      const first = await join(sessionB, openId);
      const retry = await join(sessionB, openId);
      assert(first.membership_status === 'accepted', 'First open Join was not accepted.');
      assert(retry.membership_status === 'accepted', 'Join retry changed accepted state.');
      assert(first.participant_count === 2, 'Accepted count must include host and participant.');
      assert(retry.participant_count === 2, 'Join retry changed accepted count.');
    });

    await runTest('accepted callers receive an exact active meeting point', async () => {
      const plan = (await plans(sessionB)).find((candidate) => candidate.id === openId);
      assert(plan?.membership_status === 'accepted', 'Accepted plan is missing.');
      assert(hasExactPoint(plan), 'Accepted active plan did not include exact coordinates.');
    });

    await runTest('Leave is durable, retry-safe, and removes the plan projection', async () => {
      const first = await leave(sessionB, openId);
      const retry = await leave(sessionB, openId);
      assert(first.membership_status === 'left', 'First Leave did not return left.');
      assert(retry.membership_status === 'left', 'Leave retry changed durable state.');
      assert(first.participant_count === 1, 'Leave did not release one accepted place.');
      assert(retry.participant_count === 1, 'Leave retry changed accepted count.');
      assert(first.waitlist_promoted === false, 'Leave reported an impossible promotion.');
      assert(retry.waitlist_promoted === false, 'Leave retry reported a promotion.');
      assert(
        !(await plans(sessionB)).some((plan) => plan.id === openId),
        'A left membership remained in active Plans.',
      );
    });

    const approvalId = await createActivity(sessionA, 'approval', 'APPROVE');
    await runTest('approval Join is pending and cannot receive exact coordinates', async () => {
      const outcome = await join(sessionB, approvalId);
      const plan = (await plans(sessionB)).find((candidate) => candidate.id === approvalId);
      assert(outcome.membership_status === 'pending', 'Approval Join was not pending.');
      assert(plan?.membership_status === 'pending', 'Pending plan is missing.');
      assert(hasNullExactPoint(plan), 'Pending plan exposed exact coordinates.');
      const queue = await pendingRequests(sessionA, approvalId);
      assert(queue.length === 1, 'Host pending queue did not contain exactly one request.');
      assert(
        queue[0].requester_user_id === sessionB.userId &&
          queue[0].requester_display_name === 'Participation Harness B' &&
          typeof queue[0].requested_at === 'string',
        'Host pending queue returned the wrong bounded request shape.',
      );
      const unauthorized = await rpc(
        'host_pending_activity_requests',
        { p_activity_id: approvalId, p_limit: 50 },
        sessionB.accessToken,
      );
      assert(
        !unauthorized.ok && unauthorized.payload?.code === '42501',
        `Non-host pending queue read was not denied (${safeErrorDetails(unauthorized)}).`,
      );
      const unauthorizedDecision = await rpc(
        'decide_activity_request',
        {
          p_activity_id: approvalId,
          p_decision: 'approve',
          p_requester_user_id: sessionB.userId,
        },
        sessionB.accessToken,
      );
      assert(
        !unauthorizedDecision.ok && unauthorizedDecision.payload?.code === '42501',
        `Non-host decision was not denied (${safeErrorDetails(unauthorizedDecision)}).`,
      );
    });

    await runTest('host approval is idempotent and releases exact coordinates', async () => {
      const first = await decide(sessionA, approvalId, sessionB.userId, 'approve');
      const retry = await decide(sessionA, approvalId, sessionB.userId, 'approve');
      assert(first.membership_status === 'accepted', 'Approval did not accept membership.');
      assert(retry.membership_status === 'accepted', 'Approval retry changed accepted state.');
      assert(first.participant_count === 2, 'Approval did not consume one place.');
      assert(retry.participant_count === 2, 'Approval retry changed accepted count.');
      const plan = (await plans(sessionB)).find((candidate) => candidate.id === approvalId);
      assert(plan?.membership_status === 'accepted', 'Approved plan is missing.');
      assert(hasExactPoint(plan), 'Approved active plan did not release exact coordinates.');
      assert((await pendingRequests(sessionA, approvalId)).length === 0, 'Decided request stayed pending.');
    });

    const rejectionId = await createActivity(sessionA, 'approval', 'REJECT');
    await join(sessionB, rejectionId);
    await runTest('host rejection is idempotent and removes the pending plan', async () => {
      const first = await decide(sessionA, rejectionId, sessionB.userId, 'reject');
      const retry = await decide(sessionA, rejectionId, sessionB.userId, 'reject');
      assert(first.membership_status === 'rejected', 'Decision did not reject membership.');
      assert(retry.membership_status === 'rejected', 'Rejection retry changed durable state.');
      assert(first.participant_count === 1, 'Rejection changed accepted capacity.');
      assert(retry.participant_count === 1, 'Rejection retry changed accepted capacity.');
      assert(
        !(await plans(sessionB)).some((plan) => plan.id === rejectionId),
        'A rejected membership remained in active Plans.',
      );
    });

    if (sessionC) {
      const waitlistId = await createActivity(sessionA, 'open', 'WAITLIST PROMOTION');
      let acceptedSession = null;
      let waitlistedSession = null;
      await runTest('concurrent final-place joins serialize to accepted plus waitlisted', async () => {
        const [outcomeB, outcomeC] = await Promise.all([
          join(sessionB, waitlistId),
          join(sessionC, waitlistId),
        ]);
        const outcomes = [outcomeB, outcomeC];
        assert(
          outcomes.filter((outcome) => outcome.membership_status === 'accepted').length === 1,
          'Concurrent joins did not produce exactly one accepted participant.',
        );
        assert(
          outcomes.filter((outcome) => outcome.membership_status === 'waitlisted').length === 1,
          'Concurrent joins did not produce exactly one waitlisted participant.',
        );
        assert(
          outcomes.every((outcome) => outcome.participant_count === 2),
          'Concurrent joins did not both observe the capacity-safe final count.',
        );
        acceptedSession = outcomeB.membership_status === 'accepted' ? sessionB : sessionC;
        waitlistedSession = outcomeB.membership_status === 'waitlisted' ? sessionB : sessionC;

        const retry = await join(waitlistedSession, waitlistId);
        assert(retry.membership_status === 'waitlisted', 'Waitlist retry changed state.');
        assert(retry.participant_count === 2, 'Waitlist retry changed accepted count.');
        const plan = (await plans(waitlistedSession)).find(
          (candidate) => candidate.id === waitlistId,
        );
        assert(plan?.membership_status === 'waitlisted', 'Waitlisted plan is missing.');
        assert(hasNullExactPoint(plan), 'Waitlisted plan exposed exact coordinates.');
      });
      await runTest('accepted Leave promotes the only waiter atomically', async () => {
        assert(acceptedSession && waitlistedSession, 'Concurrent join actors were not resolved.');
        const outcome = await leave(acceptedSession, waitlistId);
        assert(outcome.membership_status === 'left', 'Accepted actor did not leave.');
        assert(outcome.waitlist_promoted === true, 'Leave did not report promotion.');
        assert(outcome.participant_count === 2, 'Promotion did not preserve accepted count.');
        const promoted = (await plans(waitlistedSession)).find(
          (candidate) => candidate.id === waitlistId,
        );
        assert(promoted?.membership_status === 'accepted', 'Waiter was not promoted.');
        assert(hasExactPoint(promoted), 'Promoted actor did not receive exact coordinates.');
      });
    } else {
      console.log('SKIP capacity waitlist and promotion require optional Actor C');
    }

    if (sessionC && sessionD) {
      const fifoId = await createActivity(sessionA, 'open', 'FIFO PROMOTION');
      await join(sessionB, fifoId);
      await join(sessionC, fifoId);
      await new Promise((resolve) => setTimeout(resolve, 50));
      await join(sessionD, fifoId);
      await runTest('Leave promotes the oldest of two waiters first', async () => {
        const beforeC = (await plans(sessionC)).find((candidate) => candidate.id === fifoId);
        const beforeD = (await plans(sessionD)).find((candidate) => candidate.id === fifoId);
        assert(beforeC?.membership_status === 'waitlisted', 'First waiter is not waitlisted.');
        assert(beforeD?.membership_status === 'waitlisted', 'Second waiter is not waitlisted.');
        assert(hasNullExactPoint(beforeC), 'First waiter received exact coordinates early.');
        assert(hasNullExactPoint(beforeD), 'Second waiter received exact coordinates early.');

        const outcome = await leave(sessionB, fifoId);
        assert(outcome.waitlist_promoted === true, 'FIFO leave did not report promotion.');
        assert(outcome.participant_count === 2, 'FIFO promotion violated capacity.');

        const afterC = (await plans(sessionC)).find((candidate) => candidate.id === fifoId);
        const afterD = (await plans(sessionD)).find((candidate) => candidate.id === fifoId);
        assert(afterC?.membership_status === 'accepted', 'Oldest waiter was not promoted.');
        assert(hasExactPoint(afterC), 'Promoted oldest waiter lacks exact coordinates.');
        assert(afterD?.membership_status === 'waitlisted', 'Newer waiter was promoted first.');
        assert(hasNullExactPoint(afterD), 'Newer waiter received exact coordinates.');
      });
    } else {
      console.log('SKIP FIFO ordering proof requires optional Actors C and D');
    }
  } finally {
    const restorations = [];
    if (sessionA && originalA) {
      restorations.push(patchOwnProfile(sessionA, mutableProfile(originalA)));
    }
    if (sessionB && originalB) {
      restorations.push(patchOwnProfile(sessionB, mutableProfile(originalB)));
    }
    if (sessionC && originalC) {
      restorations.push(patchOwnProfile(sessionC, mutableProfile(originalC)));
    }
    if (sessionD && originalD) {
      restorations.push(patchOwnProfile(sessionD, mutableProfile(originalD)));
    }
    if (restorations.length > 0) {
      const responses = await Promise.allSettled(restorations);
      const cleanupFailed = responses.some(
        (result) => result.status === 'rejected' || !result.value.ok,
      );
      if (cleanupFailed) {
        console.error('FAIL client-writable profile cleanup');
        failures.push('client-writable profile cleanup');
      } else {
        console.log('PASS client-writable profile cleanup');
      }
    }
    sessionA = null;
    sessionB = null;
    sessionC = null;
    sessionD = null;
  }

  if (failures.length > 0) {
    throw new VerificationError(`${failures.length} participation check(s) failed.`);
  }

  console.log('PASS hosted participation verification complete');
}

main().catch((error) => {
  const message =
    error instanceof VerificationError
      ? error.message
      : 'Unexpected network or runtime failure.';
  console.error(`Verification stopped: ${message}`);
  process.exitCode = 1;
});
