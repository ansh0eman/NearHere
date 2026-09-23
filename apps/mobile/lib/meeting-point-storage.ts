import AsyncStorage from '@react-native-async-storage/async-storage';

import type { MeetingPointDraft } from '@/types/meeting-point';

const MEETING_POINT_DRAFT_KEY = 'nearhere.host-meeting-point-draft.v1';

function isMeetingPointDraft(value: unknown): value is MeetingPointDraft {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.label === 'string' &&
    typeof candidate.latitude === 'number' && Number.isFinite(candidate.latitude) &&
    candidate.latitude >= -90 && candidate.latitude <= 90 &&
    typeof candidate.longitude === 'number' && Number.isFinite(candidate.longitude) &&
    candidate.longitude >= -180 && candidate.longitude <= 180
  );
}

export async function readMeetingPointDraft(): Promise<MeetingPointDraft | null> {
  const rawValue = await AsyncStorage.getItem(MEETING_POINT_DRAFT_KEY);
  if (!rawValue) return null;

  try {
    const parsed: unknown = JSON.parse(rawValue);
    if (isMeetingPointDraft(parsed)) return parsed;
  } catch {
    // A broken local draft must never block a host from creating an activity.
  }

  await AsyncStorage.removeItem(MEETING_POINT_DRAFT_KEY);
  return null;
}

export async function saveMeetingPointDraft(draft: MeetingPointDraft): Promise<void> {
  await AsyncStorage.setItem(MEETING_POINT_DRAFT_KEY, JSON.stringify(draft));
}

export async function clearMeetingPointDraft(): Promise<void> {
  await AsyncStorage.removeItem(MEETING_POINT_DRAFT_KEY);
}
