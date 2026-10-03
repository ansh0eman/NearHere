import type { PlaceSearchResult } from '@/types/place-search';

/** Accept only the small coordinate contract exposed by the place-search function. */
export function parseGooglePlaceSearchResponse(value: unknown): PlaceSearchResult[] {
  if (!value || typeof value !== 'object' || !Array.isArray((value as Record<string, unknown>).results)) return [];

  return (value as { results: unknown[] }).results.flatMap((candidate) => {
    if (!candidate || typeof candidate !== 'object') return [];
    const result = candidate as Record<string, unknown>;
    const latitude = Number(result.latitude);
    const longitude = Number(result.longitude);
    if (
      typeof result.id !== 'string' || typeof result.label !== 'string' || !result.label.trim()
      || !Number.isFinite(latitude) || latitude < -90 || latitude > 90
      || !Number.isFinite(longitude) || longitude < -180 || longitude > 180
    ) return [];
    return [{ id: result.id, label: result.label.trim(), latitude, longitude }];
  });
}
