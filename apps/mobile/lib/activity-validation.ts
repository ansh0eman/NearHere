import type {
  ActivityKind,
  ActivitySummary,
  ActivityStatus,
  JoinMode,
  NearbyActivitySummary,
} from '@/types/activity';

const ACTIVITY_KINDS: ActivityKind[] = [
  'walk',
  'coffee',
  'sports',
  'study',
  'coworking',
  'creative',
  'other',
];
const ACTIVITY_STATUSES: ActivityStatus[] = ['published', 'cancelled', 'completed'];
const JOIN_MODES: JoinMode[] = ['open', 'approval'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireString(row: Record<string, unknown>, key: string): string {
  const value = row[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Activity response has an invalid ${key}.`);
  }
  return value;
}

function requireFiniteNumber(row: Record<string, unknown>, key: string): number {
  const value = row[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Activity response has an invalid ${key}.`);
  }
  return value;
}

function requireInteger(row: Record<string, unknown>, key: string): number {
  const value = requireFiniteNumber(row, key);
  if (!Number.isInteger(value)) throw new Error(`Activity response has an invalid ${key}.`);
  return value;
}

function requireTimestamp(row: Record<string, unknown>, key: string): string {
  const value = requireString(row, key);
  if (!Number.isFinite(Date.parse(value))) throw new Error(`Activity response has an invalid ${key}.`);
  return value;
}

export function parseActivitySummaryRow(value: unknown): ActivitySummary {
  if (!isRecord(value)) throw new Error('Activity response is not an object.');

  const kind = value.kind;
  const status = value.status;
  const joinMode = value.join_mode;
  if (!ACTIVITY_KINDS.includes(kind as ActivityKind)) {
    throw new Error('Activity response has an invalid kind.');
  }
  if (!ACTIVITY_STATUSES.includes(status as ActivityStatus)) {
    throw new Error('Activity response has an invalid status.');
  }
  if (!JOIN_MODES.includes(joinMode as JoinMode)) {
    throw new Error('Activity response has an invalid join_mode.');
  }

  const latitude = requireFiniteNumber(value, 'public_latitude');
  const longitude = requireFiniteNumber(value, 'public_longitude');
  const privacyRadiusM = requireInteger(value, 'privacy_radius_m');
  const participantCount = requireInteger(value, 'participant_count');
  const capacity = requireInteger(value, 'capacity');
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new Error('Activity response contains invalid public coordinates.');
  }
  if (participantCount < 0 || capacity < 2 || participantCount > capacity) {
    throw new Error('Activity response contains invalid participant capacity.');
  }
  if (privacyRadiusM < 150 || privacyRadiusM > 1000) {
    throw new Error('Activity response contains invalid distance metadata.');
  }

  return {
    id: requireString(value, 'id'),
    kind: kind as ActivityKind,
    title: requireString(value, 'title'),
    description: typeof value.description === 'string' ? value.description : '',
    status: status as ActivityStatus,
    startsAt: requireTimestamp(value, 'starts_at'),
    endsAt: requireTimestamp(value, 'ends_at'),
    publicLocation: { latitude, longitude, privacyRadiusM },
    hostDisplayName: requireString(value, 'host_display_name'),
    participantCount,
    capacity,
    joinMode: joinMode as JoinMode,
  };
}

export function parseNearbyActivityRow(value: unknown): NearbyActivitySummary {
  if (!isRecord(value)) throw new Error('Activity response is not an object.');
  const distanceM = requireFiniteNumber(value, 'distance_m');
  if (distanceM < 0) throw new Error('Activity response contains invalid distance metadata.');
  return { ...parseActivitySummaryRow(value), distanceM };
}

export function parseNearbyActivityRows(value: unknown): NearbyActivitySummary[] {
  if (!Array.isArray(value)) throw new Error('Nearby activities response is not a list.');
  return value.map(parseNearbyActivityRow);
}
