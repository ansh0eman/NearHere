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

/** Date and time dialogs return full Date objects. Compose their local parts,
 * never their ISO date strings (which would silently switch to UTC). */
export function combineLocalDateAndTime(day: Date, clock: Date): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), clock.getHours(), clock.getMinutes(), 0, 0);
}

export function formatActivityStart(value: Date): string {
  return value.toLocaleString(undefined, {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  });
}
