import AsyncStorage from '@react-native-async-storage/async-storage';

import { ManualLocation } from '@/types/location';

const MANUAL_LOCATION_KEY = 'nearhere.manual-location.v1';
let storageRevision = 0;
let storageQueue: Promise<void> = Promise.resolve();

function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const result = storageQueue.then(operation, operation);
  storageQueue = result.then(() => undefined, () => undefined);
  return result;
}

/** Lets a GPS request clear the old manual choice without deleting a newer pick. */
export function manualLocationRevision(): number {
  return storageRevision;
}

function isManualLocation(value: unknown): value is ManualLocation {
  if (typeof value !== 'object' || value === null) return false;

  const candidate = value as Record<string, unknown>;
  return (
    candidate.source === 'manual' &&
    typeof candidate.label === 'string' &&
    typeof candidate.latitude === 'number' &&
    Number.isFinite(candidate.latitude) &&
    candidate.latitude >= -90 &&
    candidate.latitude <= 90 &&
    typeof candidate.longitude === 'number' &&
    Number.isFinite(candidate.longitude) &&
    candidate.longitude >= -180 &&
    candidate.longitude <= 180
  );
}

export async function readManualLocation(): Promise<ManualLocation | null> {
  return serialize(async () => {
    const rawValue = await AsyncStorage.getItem(MANUAL_LOCATION_KEY);
    if (!rawValue) return null;

    try {
      const parsedValue: unknown = JSON.parse(rawValue);
      if (isManualLocation(parsedValue)) return parsedValue;
    } catch {
      // Invalid persisted state is discarded below instead of crashing app startup.
    }

    await AsyncStorage.removeItem(MANUAL_LOCATION_KEY);
    return null;
  });
}

export async function saveManualLocation(location: ManualLocation): Promise<void> {
  storageRevision += 1;
  await serialize(() => AsyncStorage.setItem(MANUAL_LOCATION_KEY, JSON.stringify(location)));
}

export async function clearManualLocation(): Promise<void> {
  storageRevision += 1;
  await serialize(() => AsyncStorage.removeItem(MANUAL_LOCATION_KEY));
}

export async function clearManualLocationIfUnchanged(revision: number): Promise<boolean> {
  return serialize(async () => {
    if (storageRevision !== revision) return false;
    storageRevision += 1;
    await AsyncStorage.removeItem(MANUAL_LOCATION_KEY);
    return true;
  });
}
