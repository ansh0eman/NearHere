#!/usr/bin/env node

/** Black-box hosted checks for accepted-member-only activity chat. */
const REQUIRED = ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'CHAT_PHONE_A', 'CHAT_OTP_A', 'CHAT_PHONE_B', 'CHAT_OTP_B'];
class VerificationError extends Error {}
const assert = (condition, message) => { if (!condition) throw new VerificationError(message); };
for (const key of REQUIRED) if (!process.env[key]) throw new VerificationError(`Missing required environment variables: ${key}`);
const base = process.env.EXPO_PUBLIC_SUPABASE_URL.replace(/\/$/, '');
const apiKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

async function request(path, { token, body, method = 'GET', prefer } = {}) {
  const headers = { apikey: apiKey, Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (prefer) headers.Prefer = prefer;
  const response = await fetch(`${base}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = null; }
  return { ok: response.ok, payload, status: response.status };
}
const rpc = (name, body, token) => request(`/rest/v1/rpc/${name}`, { token, body, method: 'POST' });
async function signIn(phone, otp) {
  const challenge = await request('/auth/v1/otp', { body: { create_user: true, phone }, method: 'POST' });
  assert(challenge.ok, 'OTP challenge failed.');
  const verify = await request('/auth/v1/verify', { body: { phone, token: otp, type: 'sms' }, method: 'POST' });
  assert(verify.ok && verify.payload?.access_token && verify.payload?.user?.id, 'OTP verification failed.');
  return { token: verify.payload.access_token, userId: verify.payload.user.id };
}
async function completeProfile(session, name) {
  const response = await request(`/rest/v1/profiles?id=eq.${session.userId}`, {
    token: session.token, method: 'PATCH', prefer: 'return=minimal', body: { display_name: name, onboarding_status: 'complete' },
  });
  assert(response.ok, 'Profile setup failed.');
}
async function main() {
  const failures = [];
  const test = async (name, operation) => { try { await operation(); console.log(`PASS ${name}`); } catch (error) { console.error(`FAIL ${name}: ${error instanceof VerificationError ? error.message : 'unexpected runtime failure'}`); failures.push(name); } };
  await test('anonymous chat reads and sends are denied', async () => {
    const id = '00000000-0000-0000-0000-000000000000';
    const responses = await Promise.all([
      rpc('activity_messages', { p_activity_id: id, p_limit: 1 }),
      rpc('send_activity_message', { p_activity_id: id, p_body: 'anonymous test' }),
    ]);
    assert(responses.every((response) => !response.ok && (response.status === 401 || response.payload?.code === '42501')), 'Anonymous chat command was accepted.');
  });
  const a = await signIn(process.env.CHAT_PHONE_A, process.env.CHAT_OTP_A);
  const b = await signIn(process.env.CHAT_PHONE_B, process.env.CHAT_OTP_B);
  assert(a.userId !== b.userId, 'Chat actors are not distinct.');
  await completeProfile(a, 'Chat Harness A');
  await completeProfile(b, 'Chat Harness B');
  const starts = new Date(Date.now() + 6 * 60 * 60 * 1000);
  const ends = new Date(starts.getTime() + 60 * 60 * 1000);
  const created = await rpc('create_activity', {
    p_capacity: 4, p_description: 'Development-only chat fixture.', p_ends_at: ends.toISOString(), p_join_mode: 'open',
    p_kind: 'walk', p_private_latitude: 12.9352, p_private_longitude: 77.6245, p_privacy_radius_m: 350,
    p_starts_at: starts.toISOString(), p_title: `TEST CHAT ${Date.now().toString(36)}`,
  }, a.token);
  assert(created.ok && created.payload?.[0]?.id, 'Chat activity creation failed.');
  const activityId = created.payload[0].id;
  const joined = await rpc('join_activity', { p_activity_id: activityId }, b.token);
  assert(joined.ok && joined.payload?.[0]?.membership_status === 'accepted', 'Participant did not join chat activity.');
  await test('accepted host and participant can exchange durable messages', async () => {
    const sent = await rpc('send_activity_message', { p_activity_id: activityId, p_body: 'Hello from the hosted chat harness.' }, b.token);
    assert(
      sent.ok
        && sent.payload?.[0]?.body === 'Hello from the hosted chat harness.'
        && sent.payload?.[0]?.author_display_name === 'Chat Harness B',
      'Participant message write receipt did not match the mobile chat projection.',
    );
    const messages = await rpc('activity_messages', { p_activity_id: activityId, p_limit: 50 }, a.token);
    assert(messages.ok && Array.isArray(messages.payload), `Host chat read failed (${messages.status}).`);
    assert(messages.payload.some((message) => message.body === 'Hello from the hosted chat harness.'), `Host could not read the durable message (rows=${messages.payload.length}).`);
  });
  await test('blocked author messages are filtered for an accepted member', async () => {
    const blocked = await rpc('block_user', { p_blocked_user_id: b.userId }, a.token);
    assert(blocked.ok, 'Block setup failed.');
    const hidden = await rpc('activity_messages', { p_activity_id: activityId, p_limit: 50 }, a.token);
    assert(hidden.ok && !hidden.payload.some((message) => message.author_user_id === b.userId), 'Blocked author message was not filtered.');

    const participants = await rpc('host_activity_participants', { p_activity_id: activityId }, a.token);
    assert(participants.ok && !participants.payload.some((participant) => participant.participant_user_id === b.userId), 'Blocked participant was not filtered from the host projection.');

    const nearby = await rpc('nearby_activities', {
      p_latitude: 12.9352, p_longitude: 77.6245, p_radius_m: 1000, p_kinds: null, p_starts_before: null, p_limit: 50,
    }, b.token);
    assert(nearby.ok && !nearby.payload.some((activity) => activity.id === activityId), 'Blocked host activity was still visible in discovery.');

    const detail = await rpc('activity_detail', { p_activity_id: activityId }, b.token);
    assert(detail.ok && detail.payload?.[0]?.exact_latitude === null && detail.payload?.[0]?.exact_longitude === null, 'Blocked member still received the exact meeting point.');

    await rpc('unblock_user', { p_blocked_user_id: b.userId }, a.token);
  });
  if (failures.length) { console.error(`Verification stopped: ${failures.length} chat check(s) failed.`); process.exitCode = 1; return; }
  console.log('PASS hosted chat verification complete');
}
main().catch((error) => { console.error(`Verification stopped: ${error.message}`); process.exitCode = 1; });
