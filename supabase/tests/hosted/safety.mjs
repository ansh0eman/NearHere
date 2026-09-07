#!/usr/bin/env node

/** Black-box hosted checks for the authenticated safety boundary. */
const REQUIRED = [
  'EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'SAFETY_PHONE_A', 'SAFETY_OTP_A', 'SAFETY_PHONE_B', 'SAFETY_OTP_B',
];
class VerificationError extends Error {}
const assert = (condition, message) => { if (!condition) throw new VerificationError(message); };
const config = (() => {
  const missing = REQUIRED.filter((key) => !process.env[key]);
  if (missing.length) throw new VerificationError(`Missing required environment variables: ${missing.join(', ')}`);
  return {
    base: process.env.EXPO_PUBLIC_SUPABASE_URL.replace(/\/$/, ''),
    key: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    a: { phone: process.env.SAFETY_PHONE_A, otp: process.env.SAFETY_OTP_A },
    b: { phone: process.env.SAFETY_PHONE_B, otp: process.env.SAFETY_OTP_B },
  };
})();

async function request(path, { token, body, method = 'GET' } = {}) {
  const headers = { apikey: config.key, Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${config.base}${path}`, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = null; }
  return { ok: response.ok, payload, status: response.status };
}

async function rpc(name, body, token) {
  return request(`/rest/v1/rpc/${name}`, { token, body, method: 'POST' });
}

async function session(actor) {
  const challenge = await request('/auth/v1/otp', { body: { create_user: true, phone: actor.phone }, method: 'POST' });
  assert(challenge.ok, 'OTP challenge failed.');
  const verify = await request('/auth/v1/verify', {
    body: { phone: actor.phone, token: actor.otp, type: 'sms' }, method: 'POST',
  });
  assert(verify.ok && verify.payload?.access_token && verify.payload?.user?.id, 'OTP verification failed.');
  return { accessToken: verify.payload.access_token, userId: verify.payload.user.id };
}

async function main() {
  const failures = [];
  const test = async (name, operation) => {
    try { await operation(); console.log(`PASS ${name}`); }
    catch (error) { console.error(`FAIL ${name}: ${error instanceof VerificationError ? error.message : 'unexpected runtime failure'}`); failures.push(name); }
  };

  await test('anonymous safety commands are denied', async () => {
    const zero = '00000000-0000-0000-0000-000000000000';
    const responses = await Promise.all([
      rpc('report_safety_issue', { p_reported_user_id: zero, p_reason: 'spam', p_details: '' }),
      rpc('block_user', { p_blocked_user_id: zero }),
      rpc('unblock_user', { p_blocked_user_id: zero }),
    ]);
    assert(responses.every((response) => !response.ok && (response.status === 401 || response.payload?.code === '42501')),
      'Anonymous safety command was accepted.');
  });

  const actorA = await session(config.a);
  const actorB = await session(config.b);
  assert(actorA.userId !== actorB.userId, 'Safety actors are not distinct.');
  console.log('PASS two distinct safety actors established');

  await test('report is authenticated, self-protected, and idempotent', async () => {
    const self = await rpc('report_safety_issue', { p_reported_user_id: actorA.userId, p_reason: 'spam', p_details: '' }, actorA.accessToken);
    assert(!self.ok && self.payload?.code === '22023', 'Self-report was accepted.');
    const first = await rpc('report_safety_issue', { p_reported_user_id: actorB.userId, p_reason: 'spam', p_details: 'Development test report.' }, actorA.accessToken);
    const retry = await rpc('report_safety_issue', { p_reported_user_id: actorB.userId, p_reason: 'spam', p_details: 'Development test report.' }, actorA.accessToken);
    assert(first.ok && retry.ok && first.payload?.[0]?.reported === true && retry.payload?.[0]?.reported === true, 'Report was not retry-safe.');
  });

  await test('block and unblock are authenticated and idempotent', async () => {
    const first = await rpc('block_user', { p_blocked_user_id: actorB.userId }, actorA.accessToken);
    const retry = await rpc('block_user', { p_blocked_user_id: actorB.userId }, actorA.accessToken);
    const self = await rpc('block_user', { p_blocked_user_id: actorA.userId }, actorA.accessToken);
    const unblock = await rpc('unblock_user', { p_blocked_user_id: actorB.userId }, actorA.accessToken);
    assert(first.ok && retry.ok && unblock.ok, 'Block lifecycle did not complete.');
    assert(self.payload?.code === '22023', 'Self-block was accepted.');
  });

  await test('non-operators cannot read or mutate the review queue', async () => {
    const queue = await rpc('operator_safety_reports', { p_status: 'open', p_limit: 10 }, actorA.accessToken);
    const review = await rpc('review_safety_report', {
      p_report_id: '00000000-0000-0000-0000-000000000000',
      p_decision: 'dismissed',
      p_resolution: 'Development denial check.',
    }, actorA.accessToken);
    assert(!queue.ok && queue.payload?.code === '42501', 'Non-operator read was accepted.');
    assert(!review.ok && review.payload?.code === '42501', 'Non-operator review was accepted.');
  });

  if (failures.length) { console.error(`Verification stopped: ${failures.length} safety check(s) failed.`); process.exitCode = 1; return; }
  console.log('PASS hosted safety verification complete');
}

main().catch((error) => { console.error(`Verification stopped: ${error.message}`); process.exitCode = 1; });
