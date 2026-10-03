#!/usr/bin/env node

/** Anonymous smoke test for the deployed public host-avatar detail projection. */
const base = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!base || !key) throw Error('Load the mobile public Supabase environment first.');

async function rpc(name, body) {
  const response = await fetch(`${base}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw Error(`${name} failed with HTTP ${response.status}.`);
  return response.json();
}

function assert(condition, message) {
  if (!condition) throw Error(message);
}

const activities = await rpc('nearby_activities_with_avatars', {
  p_latitude: 12.9283,
  p_longitude: 77.6739,
  p_radius_m: 5000,
  p_kinds: null,
  p_starts_before: null,
  p_limit: 20,
});
assert(Array.isArray(activities), 'Discovery response was not a list.');
let checked = 0;
for (const activity of activities.slice(0, 3)) {
  const rows = await rpc('activity_detail_with_avatar', { p_activity_id: activity.id });
  assert(Array.isArray(rows) && rows.length === 1, 'Expected exactly one public detail row.');
  const row = rows[0];
  assert(row.membership_role === null && row.membership_status === null, 'Anonymous detail disclosed membership.');
  assert(row.exact_latitude === null && row.exact_longitude === null, 'Anonymous detail disclosed the private meeting point.');
  const avatar = row.host_avatar_config;
  if (avatar !== null) {
    const v1 = avatar.version === 1
      && Object.keys(avatar).every((field) => ['version', 'seed', 'avatarId'].includes(field))
      && (typeof avatar.seed === 'string' || typeof avatar.avatarId === 'string');
    const v3 = avatar.version === 3
      && Object.keys(avatar).every((field) => ['version', 'seed', 'catalogVersion', 'appearanceId', 'fallbackAvatarId'].includes(field))
      && typeof avatar.seed === 'string'
      && avatar.catalogVersion === 1
      && ['kenney-01', 'kenney-02', 'kenney-03', 'kenney-04', 'kenney-05', 'kenney-06', 'kenney-07', 'kenney-08'].includes(avatar.appearanceId)
      && ['v1-01', 'v1-02', 'v1-03', 'v1-04', 'v1-05', 'v1-06'].includes(avatar.fallbackAvatarId);
    assert(v1 || v3, 'Avatar projection has an unsupported or unapproved shape.');
    assert(JSON.stringify(avatar) === JSON.stringify(activity.host_avatar_config), 'Detail and discovery avatar projections differ.');
  }
  checked++;
}
console.log(`PASS anonymous avatar detail projection (${checked} activities; private coordinates remained null)`);
