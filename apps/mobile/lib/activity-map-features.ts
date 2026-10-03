import type { Feature, FeatureCollection, Point } from 'geojson';

import { avatarChoice } from './avatar-identity.ts';
import type { ActivityKind, NearbyActivitySummary } from '@/types/activity';

export interface ActivityMapProperties {
  activityId: string;
  avatarIcon: string;
  /** Safe, short public cue; never contains the user-authored title or private data. */
  mapLabel: string;
}

const KIND_LABELS: Record<ActivityKind, string> = {
  walk: 'Walk',
  coffee: 'Coffee',
  sports: 'Sports',
  study: 'Study',
  coworking: 'Coworking',
  creative: 'Creative',
  other: 'Activity',
};

/** A short distance label, derived from the already-public discovery distance. */
export function formatMapDistance(distanceM: number): string {
  if (!Number.isFinite(distanceM) || distanceM < 0) return 'Nearby';
  if (distanceM < 1_000) return `${Math.round(distanceM / 10) * 10} m`;
  const kilometers = distanceM / 1_000;
  const rounded = kilometers < 10 ? Number(kilometers.toFixed(1)) : Math.round(kilometers);
  return `${rounded} km`;
}

function buildMapLabel(kind: ActivityKind, distanceM: number): string {
  const category = KIND_LABELS[kind] ?? KIND_LABELS.other;
  return `${category} · ${formatMapDistance(distanceM)}`;
}

/**
 * Renderer input intentionally contains public nearby summaries only. The
 * runtime guard rejects detail/SQL-shaped rows that carry exact coordinates.
 */
export function buildActivityMapFeatures(
  activities: readonly NearbyActivitySummary[],
): FeatureCollection<Point, ActivityMapProperties> {
  const seenIds = new Set<string>();
  const features: Feature<Point, ActivityMapProperties>[] = [];

  for (const activity of activities) {
    const candidate = activity as unknown as Record<string, unknown>;
    if ('exactMeetingLocation' in candidate || 'exact_latitude' in candidate || 'private_latitude' in candidate) {
      continue;
    }
    if (typeof activity.id !== 'string' || !activity.id || seenIds.has(activity.id)) continue;

    const { latitude, longitude } = activity.publicLocation;
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90
      || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) continue;

    seenIds.add(activity.id);
    const avatarId = avatarChoice(activity.hostAvatarConfig, activity.hostDisplayName);
    features.push({
      type: 'Feature',
      id: activity.id,
      geometry: { type: 'Point', coordinates: [longitude, latitude] },
      properties: {
        activityId: activity.id,
        avatarIcon: `avatar-${avatarId}`,
        mapLabel: buildMapLabel(activity.kind, activity.distanceM),
      },
    });
  }

  return { type: 'FeatureCollection', features };
}

/**
 * A selected map label is optional decoration. Suppress it when another public
 * activity point is nearby, because the full-body avatar art cannot be reliably
 * represented by the map engine's smaller collision box.
 */
export function shouldShowSelectedMapLabel(
  collection: FeatureCollection<Point, ActivityMapProperties>,
  selectedId: string | null,
  minimumSeparationM = 250,
): boolean {
  if (!selectedId || !Number.isFinite(minimumSeparationM) || minimumSeparationM < 0) return false;
  const selected = collection.features.find(({ properties }) => properties.activityId === selectedId);
  if (!selected) return false;

  const [selectedLongitude, selectedLatitude] = selected.geometry.coordinates;
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const distanceTo = (longitude: number, latitude: number) => {
    const latitudeDelta = radians(latitude - selectedLatitude);
    const longitudeDelta = radians(longitude - selectedLongitude);
    const latitudeStart = radians(selectedLatitude);
    const latitudeEnd = radians(latitude);
    const haversine = Math.sin(latitudeDelta / 2) ** 2
      + Math.cos(latitudeStart) * Math.cos(latitudeEnd) * Math.sin(longitudeDelta / 2) ** 2;
    return 6_371_000 * 2 * Math.asin(Math.sqrt(Math.min(1, haversine)));
  };

  return collection.features.every((feature) => feature.properties.activityId === selectedId
    || distanceTo(feature.geometry.coordinates[0], feature.geometry.coordinates[1]) >= minimumSeparationM);
}

export function resolveSelectedActivity<T extends { id: string }>(
  visibleActivities: readonly T[],
  selectedId: string | null,
): T | null {
  return selectedId === null ? null : visibleActivities.find(({ id }) => id === selectedId) ?? null;
}

/** Camera's bottom padding keeps focused map features clear of the measured UI overlay. */
export function cameraBottomPadding(overlayHeight: number, mapHeight: number): number {
  if (!Number.isFinite(overlayHeight) || !Number.isFinite(mapHeight) || mapHeight <= 0) return 0;
  return Math.round(Math.min(Math.max(overlayHeight, 0), mapHeight * 0.55));
}

/** Keep camera motion purposeful while honoring the OS Reduce Motion preference. */
export function cameraMotionDuration(durationMs: number, reduceMotion: boolean): number {
  if (!Number.isFinite(durationMs) || durationMs <= 0 || reduceMotion) return 0;
  return Math.min(Math.round(durationMs), 1_200);
}
