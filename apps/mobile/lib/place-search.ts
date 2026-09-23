import { PlaceSearchResult } from '@/types/place-search';

const SEARCH_RESULT_LIMIT = 5;
const MINIMUM_REQUEST_INTERVAL_MS = 1_100;
const MAXIMUM_CACHE_ENTRIES = 20;
const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';
const resultCache = new Map<string, PlaceSearchResult[]>();
let lastRequestStartedAt = 0;

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function cacheResults(query: string, results: PlaceSearchResult[]) {
  if (resultCache.size >= MAXIMUM_CACHE_ENTRIES) {
    const oldestQuery = resultCache.keys().next().value;
    if (typeof oldestQuery === 'string') resultCache.delete(oldestQuery);
  }

  resultCache.set(query, results);
}

function parseSearchResult(value: unknown): PlaceSearchResult | null {
  if (typeof value !== 'object' || value === null) return null;

  const candidate = value as Record<string, unknown>;
  const latitude = Number(candidate.lat);
  const longitude = Number(candidate.lon);

  if (
    (typeof candidate.place_id !== 'number' && typeof candidate.place_id !== 'string') ||
    typeof candidate.display_name !== 'string' ||
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return {
    id: String(candidate.place_id),
    label: candidate.display_name,
    latitude,
    longitude,
  };
}

export async function searchPlaces(query: string): Promise<PlaceSearchResult[]> {
  const normalizedQuery = query.trim();
  if (normalizedQuery.length < 2) return [];

  const cacheKey = normalizedQuery.toLocaleLowerCase();
  const cachedResults = resultCache.get(cacheKey);
  if (cachedResults) return cachedResults;

  const elapsedSincePreviousRequest = Date.now() - lastRequestStartedAt;
  const remainingDelay = MINIMUM_REQUEST_INTERVAL_MS - elapsedSincePreviousRequest;
  if (remainingDelay > 0) await wait(remainingDelay);

  lastRequestStartedAt = Date.now();

  const requestUrl = `${NOMINATIM_SEARCH_URL}?format=jsonv2&limit=${SEARCH_RESULT_LIMIT}&q=${encodeURIComponent(normalizedQuery)}`;
  const response = await fetch(requestUrl, {
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'en',
      'User-Agent': 'NearHere/0.1',
    },
  });

  if (!response.ok) {
    throw new Error(`Place search failed with status ${response.status}`);
  }

  const payload: unknown = await response.json();
  if (!Array.isArray(payload)) throw new Error('Place search returned an invalid response');

  const results = payload.map(parseSearchResult).filter((result): result is PlaceSearchResult => result !== null);
  cacheResults(cacheKey, results);
  return results;
}
