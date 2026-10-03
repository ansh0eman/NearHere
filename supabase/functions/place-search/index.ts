const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json; charset=utf-8',
};

const MAX_QUERY_LENGTH = 160;
const MAX_RESULTS = 5;
const REQUEST_TIMEOUT_MS = 6_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 15;
const RATE_LIMIT_MAX_KEYS = 500;

type PlaceResult = { id: string; label: string; latitude: number; longitude: number };
type RateLimitEntry = { count: number; resetAt: number };

// Edge isolates are short lived, so this is only a best-effort abuse brake.
// Production launch also needs a durable gateway/WAF quota chosen with the provider.
const rateLimits = new Map<string, RateLimitEntry>();

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { headers: corsHeaders, status });
}

function requestKey(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim() || 'unknown';
}

function allowsRequest(key: string) {
  const now = Date.now();
  const existing = rateLimits.get(key);
  if (!existing || existing.resetAt <= now) {
    if (rateLimits.size >= RATE_LIMIT_MAX_KEYS) {
      const oldestKey = rateLimits.keys().next().value;
      if (oldestKey) rateLimits.delete(oldestKey);
    }
    rateLimits.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (existing.count >= RATE_LIMIT_MAX_REQUESTS) return false;
  existing.count += 1;
  return true;
}

function validCoordinate(value: unknown, minimum: number, maximum: number) {
  return typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum;
}

function parseRequest(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Record<string, unknown>;
  const query = typeof candidate.query === 'string' ? candidate.query.trim().replace(/\s+/g, ' ') : '';
  if (query.length < 2 || query.length > MAX_QUERY_LENGTH || /[\u0000-\u001F\u007F]/.test(query)) return null;

  const latitude = candidate.latitude;
  const longitude = candidate.longitude;
  const hasLocationBias = latitude !== undefined || longitude !== undefined;
  if (hasLocationBias && (!validCoordinate(latitude, -90, 90) || !validCoordinate(longitude, -180, 180))) return null;

  return { latitude: hasLocationBias ? latitude as number : undefined, longitude: hasLocationBias ? longitude as number : undefined, query };
}

function parseGooglePlace(value: unknown): PlaceResult | null {
  if (!value || typeof value !== 'object') return null;
  const place = value as Record<string, unknown>;
  const location = place.location;
  const displayName = place.displayName;
  if (!location || typeof location !== 'object' || !displayName || typeof displayName !== 'object') return null;

  const latitude = (location as Record<string, unknown>).latitude;
  const longitude = (location as Record<string, unknown>).longitude;
  const name = (displayName as Record<string, unknown>).text;
  const formattedAddress = place.formattedAddress;
  const id = place.id;
  if (
    typeof id !== 'string' || !validCoordinate(latitude, -90, 90) || !validCoordinate(longitude, -180, 180)
    || typeof name !== 'string' || name.trim().length === 0
  ) return null;

  const address = typeof formattedAddress === 'string' && formattedAddress.trim() ? formattedAddress.trim() : null;
  return { id, label: address && address !== name ? `${name.trim()}, ${address}` : name.trim(), latitude, longitude };
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return response({ error: 'Method not allowed.' }, 405);
  if (!request.headers.get('authorization')) return response({ error: 'Authorization is required.' }, 401);
  if (!allowsRequest(requestKey(request))) return response({ error: 'Too many place searches. Try again shortly.' }, 429);

  const parsed = parseRequest(await request.json().catch(() => null));
  if (!parsed) return response({ error: 'Provide a valid place search query.' }, 400);

  const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
  if (!apiKey) return response({ error: 'Place search is not configured.' }, 503);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const providerResponse = await fetch('https://places.googleapis.com/v1/places:searchText', {
      body: JSON.stringify({
        textQuery: parsed.query,
        languageCode: 'en',
        maxResultCount: MAX_RESULTS,
        regionCode: 'IN',
        ...(parsed.latitude === undefined ? {} : {
          locationBias: {
            circle: {
              center: { latitude: parsed.latitude, longitude: parsed.longitude },
              radius: 50_000,
            },
          },
        }),
      }),
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location',
      },
      method: 'POST',
      signal: controller.signal,
    });

    if (!providerResponse.ok) return response({ error: 'Place search is temporarily unavailable.' }, 502);
    const payload: unknown = await providerResponse.json();
    const places = payload && typeof payload === 'object' && Array.isArray((payload as Record<string, unknown>).places)
      ? (payload as Record<string, unknown>).places
      : [];
    return response({ results: places.map(parseGooglePlace).filter((place): place is PlaceResult => place !== null) });
  } catch {
    return response({ error: 'Place search is temporarily unavailable.' }, 502);
  } finally {
    clearTimeout(timeout);
  }
});
