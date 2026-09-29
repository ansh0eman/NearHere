/** Persistent DEV fixtures. No deletion, cancellation, cleanup, or profile renaming. */
import { closeSync, fstatSync, lstatSync, openSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { indexHostedDemoSlots } from './demo-activities-utils.mjs';

// V1 is preserved as historical development data. V2 starts a current visual
// batch instead of treating ended V1 rows as evidence that discovery is populated.
const DEMO_MARKER = 'NEARHERE_DEMO_V2';

const base = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
if (base !== 'https://gmgtugbvnvhdmfuoifcc.supabase.co') throw Error('Only the NearHere development project is allowed.');
const apiKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const actors = JSON.parse(process.env.DEV_DEMO_ACTORS ?? '[]');
if (!apiKey || actors.length < 3 || actors.some(a => !/^\+1650555123[4-7]$/.test(a.phone) || !/^\d{6}$/.test(a.otp))) {
  throw Error('Provide at least three approved fictional test actors via DEV_DEMO_ACTORS.');
}
if (new Set(actors.map(actor => actor.phone)).size !== actors.length) throw Error('Each fixture actor must be distinct.');

// Prevent overlapping fixture runs on this machine. A stale lock is deliberately
// not removed automatically; inspect its local PID before clearing that exact file.
const lockPath = join(tmpdir(), 'nearhere-demo-activities-gmgtugbvnvhdmfuoifcc.lock');
let lockFd;
try {
  lockFd = openSync(lockPath, 'wx', 0o600);
} catch (error) {
  if (error?.code === 'EEXIST') throw Error('A demo fixture run is already active, or its lock needs manual stale-process review.');
  throw error;
}
writeFileSync(lockFd, JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
process.on('exit', () => {
  try {
    const locked = fstatSync(lockFd);
    const current = lstatSync(lockPath);
    if (locked.dev === current.dev && locked.ino === current.ino) unlinkSync(lockPath);
  } catch { /* Preserve the primary fixture result if lock cleanup fails. */ }
  try { closeSync(lockFd); } catch { /* The process is exiting. */ }
});

async function request(path, body, token, method = 'POST') {
  const response = await fetch(`${base}${path}`, { method, headers: {
    apikey: apiKey, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  if (!response.ok) throw Error(`Demo request failed: ${path.split('?')[0]} HTTP ${response.status}`);
  const raw = await response.text();
  return raw ? JSON.parse(raw) : null;
}
const rpc = (name, body, token) => request(`/rest/v1/rpc/${name}`, body, token);
const sessions = [];
for (const actor of actors) {
  await request('/auth/v1/otp', { phone: actor.phone, create_user: true });
  const session = await request('/auth/v1/verify', { phone: actor.phone, token: actor.otp, type: 'sms' });
  const profiles = await request(`/rest/v1/profiles?id=eq.${session.user.id}&select=onboarding_status`, undefined, session.access_token, 'GET');
  if (profiles[0]?.onboarding_status !== 'complete') throw Error('Complete each test account profile first; existing names will not be overwritten.');
  sessions.push({ userId: session.user.id, token: session.access_token });
}
const titles = ['Sunset lake walk', 'Coffee and conversation', 'Casual badminton', 'Sketch the neighbourhood',
  'Quiet study hour', 'Coworking morning', 'Weekend photo walk', 'Bring your favourite book',
  'Beginner stretch circle', 'Chai after work', 'Watercolour afternoon', 'Walk and talk'];
const kinds = ['walk', 'coffee', 'sports', 'creative', 'study', 'coworking', 'walk', 'other', 'sports', 'coffee', 'creative', 'walk'];
// Caller-scoped inventory is complete below the 100-row RPC cap. Refuse an
// ambiguous full result rather than falling back to visibility-limited discovery.
const existingSlots = new Map();
for (const actor of sessions) {
  const plans = await rpc('my_plans', { p_limit: 100 }, actor.token);
  if (!Array.isArray(plans)) throw Error('Hosted plan inventory was not a row list.');
  const actorSlots = indexHostedDemoSlots(plans, titles.length, 100, DEMO_MARKER);
  for (const [slot, activityId] of actorSlots) {
    const priorId = existingSlots.get(slot);
    if (priorId && priorId !== activityId) {
      throw Error(`More than one account owns a fixture for slot ${slot}; preserving both and stopping.`);
    }
    existingSlots.set(slot, activityId);
  }
}

// Public neighbourhood reference, not the developer's live device location.
const latitude = 12.9283, longitude = 77.6739;
let created = 0, retained = existingSlots.size;
for (let i = 0; i < titles.length; i++) {
  if (existingSlots.has(i)) continue;
  const token = sessions[i % sessions.length].token;
  const marker = `[${DEMO_MARKER}:${i}]`;
  const starts = Date.now() + (i + 1) * 6 * 60 * 60 * 1000;
  const result = await rpc('create_activity', {
    p_title: `Demo · ${titles[i]}`, p_description: `${marker} Development preview only — not a real invitation. ${titles[i]} with neighbours.`,
    p_kind: kinds[i], p_capacity: 6, p_join_mode: i % 4 === 0 ? 'approval' : 'open',
    p_starts_at: new Date(starts).toISOString(), p_ends_at: new Date(starts + 2 * 60 * 60 * 1000).toISOString(),
    p_private_latitude: latitude + Math.sin(i * 2.4) * 0.006,
    p_private_longitude: longitude + Math.cos(i * 2.4) * 0.006, p_privacy_radius_m: 350,
  }, token);
  if (!result?.[0]?.id) throw Error('Missing created activity receipt.');
  created++;
  // Create receipt is now visible in the host's caller-scoped plans even if the
  // following Join call fails; a retry will retain it rather than duplicate it.
  await rpc('join_activity', { p_activity_id: result[0].id }, sessions[(i + 1) % sessions.length].token);
}
console.log(JSON.stringify({ created, retained, actors: sessions.length, area: 'Bellandur', policy: 'No rows deleted, cancelled or renamed' }));
