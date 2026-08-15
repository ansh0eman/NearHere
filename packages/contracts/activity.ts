export type JoinMode = 'open' | 'approval';

export interface ActivitySummary {
  id: string;
  type: string;
  title: string;
  startsAt: string;
  publicLatitude: number;
  publicLongitude: number;
  participantCount: number;
  maxParticipants?: number;
  joinMode: JoinMode;
}

export interface ActivityEvent {
  id: string;
  type: 'activity.created' | 'activity.updated' | 'activity.participant_count_changed';
  occurredAt: string;
  scope: string;
  data: Record<string, unknown>;
}
