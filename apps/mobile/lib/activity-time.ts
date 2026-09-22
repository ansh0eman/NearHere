export const QUICK_START_OPTIONS = [
  { id: '30m', label: '30 min', minutes: 30 },
  { id: '1h', label: '1 hour', minutes: 60 },
  { id: 'tomorrow', label: 'Tomorrow', minutes: 24 * 60 },
] as const;

/**
 * Returns a future time rounded to a minute. Keeping this logic outside the
 * screen makes the product rule testable without rendering a native picker.
 */
export function quickStartDate(minutesFromNow: number, now = new Date()): Date {
  return new Date(Math.ceil((now.getTime() + minutesFromNow * 60_000) / 60_000) * 60_000);
}

export function isFutureStart(value: Date, now = new Date()): boolean {
  return value.getTime() > now.getTime();
}

export function formatActivityStart(value: Date): string {
  return value.toLocaleString(undefined, {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  });
}
