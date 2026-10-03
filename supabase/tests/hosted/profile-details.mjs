/** Development-only black-box profile command acceptance. No privileged token.
 * Reuses configured fictional RLS actors; restores profile fields in finally.
 * Revision and updated_at intentionally advance. No activities are modified. */
import assert from 'node:assert/strict';

const env = process.env;
const url = env.EXPO_PUBLIC_SUPABASE_URL;
const key = env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
for (const name of ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'PROFILE_RLS_PHONE_A', 'PROFILE_RLS_OTP_A', 'PROFILE_RLS_PHONE_B', 'PROFILE_RLS_OTP_B']) {
  assert(env[name], `Missing ${name}`);
}
assert(url === 'https://gmgtugbvnvhdmfuoifcc.supabase.co', 'Development project only');
for (const actor of ['A', 'B']) assert(/^\+1650555123[4-7]$/.test(env[`PROFILE_RLS_PHONE_${actor}`]), 'Fictional actors only');

async function request(path, token, body, method = body === undefined ? 'GET' : 'POST', single = false) {
  const response = await fetch(`${url}${path}`, {
    method,
    headers: { apikey: key, ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json', Prefer: 'return=representation',
      Accept: single ? 'application/vnd.pgrst.object+json' : 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const payload = await response.json().catch(() => null);
  return { ok: response.ok, status: response.status, payload };
}
function requireOK(result, label) {
  assert(result.ok, `${label}: HTTP ${result.status}, code ${result.payload?.code ?? 'none'}`);
  return result.payload;
}
async function login(actor) {
  const phone = env[`PROFILE_RLS_PHONE_${actor}`];
  requireOK(await request('/auth/v1/otp', null, { phone, create_user: false }), 'Test OTP request');
  const result = requireOK(await request('/auth/v1/verify', null, { phone, token: env[`PROFILE_RLS_OTP_${actor}`], type: 'sms' }), 'Test verification');
  return { token: result.access_token, id: result.user.id };
}
const read = async actor => requireOK(await request(`/rest/v1/profiles?id=eq.${actor.id}&select=*`, actor.token, undefined, 'GET', true), 'Owner read');
const save = (actor, revision, changes) => request('/rest/v1/rpc/update_my_profile_v2', actor?.token, { p_expected_revision: revision, p_changes: changes }, 'POST', true);
const patch = (actor, changes) => request(`/rest/v1/profiles?id=eq.${actor.id}`, actor.token, changes, 'PATCH');
const pass = label => console.log(`PASS ${label}`);

let actorA, original, changed = false;
try {
  actorA = await login('A');
  const actorB = await login('B');
  assert.notEqual(actorA.id, actorB.id, 'Actors must differ');
  original = await read(actorA);
  assert.equal((await save(null, original.profile_revision, {})).ok, false);
  const crossRead = requireOK(await request(`/rest/v1/profiles?id=eq.${actorA.id}&select=*`, actorB.token), 'Cross-user read');
  assert.equal(crossRead.length, 0);
  assert.equal((await save(actorB, 0, { id: actorA.id })).ok, false);
  pass('anonymous denial, owner isolation and owner-ID injection denial');

  const updated = requireOK(await save(actorA, original.profile_revision, {
    display_name: '😀'.repeat(40), bio: '😀'.repeat(160), city_label: '\u00a0Bengaluru\n', interests: ['coffee', 'walk'], avatar_id: 'v1-04',
  }), 'Atomic save');
  changed = true;
  assert.equal(updated.profile_revision, original.profile_revision + 1);
  assert.equal(updated.avatar_config.seed, original.avatar_config.seed);
  assert.equal(updated.city_label, 'Bengaluru');
  assert.equal(updated.public_profile_enabled, false);
  pass('atomic optional fields, Unicode limits, trim, stable seed and private default');

  for (const changes of [{ bio: '😀'.repeat(161) }, { city_label: 'x'.repeat(81) }, { interests: ['not-allowed'] }, { interests: [7] }, { avatar_id: 'unknown' }, { public_profile_enabled: true }, { seed: 'replacement' }]) {
    assert.equal((await save(actorA, updated.profile_revision, changes)).ok, false, 'Invalid command must fail');
  }
  assert.equal((await read(actorA)).profile_revision, updated.profile_revision);
  pass('invalid fields rejected atomically without advancing revision');

  const race = await Promise.all([save(actorA, updated.profile_revision, { bio: 'First edit' }), save(actorA, updated.profile_revision, { bio: 'Second edit' })]);
  assert.equal(race.filter(item => item.ok).length, 1);
  assert.equal(race.find(item => !item.ok).payload.code, 'P0001');
  const afterRace = await read(actorA);
  assert.equal(afterRace.profile_revision, updated.profile_revision + 1);
  assert.equal(afterRace.city_label, 'Bengaluru');
  pass('concurrent edits yield one winner and one conflict; omitted fields preserved');

  for (const changes of [{ bio: 'bypass' }, { profile_revision: 0 }, { public_profile_enabled: true }, { avatar_config: { version: 1, seed: 'replacement' } }]) {
    assert.equal((await patch(actorA, changes)).ok, false, 'Direct protected-column write must fail');
  }
  requireOK(await patch(actorA, { display_name: 'Profile Harness' }), 'Legacy name edit');
  const legacy = await read(actorA);
  assert.equal(legacy.profile_revision, afterRace.profile_revision + 1);
  assert.equal(legacy.avatar_config.seed, original.avatar_config.seed);
  const cleared = requireOK(await save(actorA, legacy.profile_revision, { bio: null, city_label: '' }), 'Explicit clear');
  assert.equal(cleared.bio, null);
  assert.equal(cleared.city_label, null);
  pass('legacy edit advances revision; seed and new columns protected; explicit clear works');
} catch (error) {
  // Assertion objects may contain private payloads: print only controlled text.
  console.error(`FAIL ${error instanceof Error ? error.message.split('\n')[0] : 'profile acceptance'}`);
  process.exitCode = 1;
} finally {
  if (changed && original && actorA) {
    try {
      const current = await read(actorA);
      requireOK(await save(actorA, current.profile_revision, { bio: original.bio, city_label: original.city_label }), 'Restore details');
      requireOK(await patch(actorA, { display_name: original.display_name, onboarding_status: original.onboarding_status,
        avatar_config: original.avatar_config, interests: original.interests }), 'Restore legacy fields');
      const restored = await read(actorA);
      for (const field of ['display_name', 'onboarding_status', 'avatar_config', 'interests', 'bio', 'city_label', 'public_profile_enabled']) {
        assert.deepEqual(restored[field], original[field], `Restore mismatch: ${field}`);
      }
      pass('original profile fields restored; only server revision/timestamp advanced');
    } catch {
      console.error('FAIL profile restoration requires inspection before further tests');
      process.exitCode = 1;
    }
  }
}
