import AsyncStorage from '@react-native-async-storage/async-storage';

import { ManualLocation } from '@/types/location';

const MANUAL_LOCATION_KEY = 'nearhere.manual-location.v1';

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
}

export async function saveManualLocation(location: ManualLocation): Promise<void> {
  await AsyncStorage.setItem(MANUAL_LOCATION_KEY, JSON.stringify(location));
}

export async function clearManualLocation(): Promise<void> {
  await AsyncStorage.removeItem(MANUAL_LOCATION_KEY);
}
