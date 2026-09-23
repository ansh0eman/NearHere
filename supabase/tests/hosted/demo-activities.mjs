/** Persistent DEV fixtures. No deletion, cancellation, cleanup, or profile renaming. */
const base = process.env.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
if (base !== 'https://gmgtugbvnvhdmfuoifcc.supabase.co') throw Error('Only the NearHere development project is allowed.');
const apiKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const actors = JSON.parse(process.env.DEV_DEMO_ACTORS ?? '[]');
if (!apiKey || actors.length < 3 || actors.some(a => !/^\+1650555123[4-7]$/.test(a.phone) || !/^\d{6}$/.test(a.otp))) {
  throw Error('Provide at least three approved fictional test actors via DEV_DEMO_ACTORS.');
}
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
  sessions.push(session.access_token);
}
const titles = ['Sunset lake walk', 'Coffee and conversation', 'Casual badminton', 'Sketch the neighbourhood',
  'Quiet study hour', 'Coworking morning', 'Weekend photo walk', 'Bring your favourite book',
  'Beginner stretch circle', 'Chai after work', 'Watercolour afternoon', 'Walk and talk'];
const kinds = ['walk', 'coffee', 'sports', 'creative', 'study', 'coworking', 'walk', 'other', 'sports', 'coffee', 'creative', 'walk'];
// Public neighbourhood reference, not the developer's live device location.
const latitude = 12.9283, longitude = 77.6739;
let created = 0, retained = 0;
for (let i = 0; i < titles.length; i++) {
  const token = sessions[i % sessions.length];
  const marker = `[NEARHERE_DEMO_V1:${i}]`;
  const nearby = await rpc('nearby_activities', { p_latitude: latitude, p_longitude: longitude, p_radius_m: 3000, p_limit: 100 }, token);
  if (nearby.some(a => a.description?.includes(marker))) { retained++; continue; }
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
  await rpc('join_activity', { p_activity_id: result[0].id }, sessions[(i + 1) % sessions.length]);
}
console.log(JSON.stringify({ created, retained, hosts: sessions.length, area: 'Bellandur', policy: 'No rows deleted or cancelled' }));
