export type ManualRestoreResult = 'applied' | 'empty' | 'superseded';
export type LocationSourceForPresentation = 'default' | 'device' | 'manual';

/** Keep the selected region but never present a failed device fix as current. */
export function locationFailurePresentation(
  source: LocationSourceForPresentation,
  currentLabel: string,
): { deviceLocation: null; label: string } {
  return {
    deviceLocation: null,
    label: source === 'device' ? 'Last known area' : currentLabel,
  };
}

/** A superseded read is NOT an empty store: startup must not restart GPS. */
export async function restoreManualSelection<T>(
  read: () => Promise<T | null>,
  isCurrent: () => boolean,
  apply: (location: T) => void,
): Promise<ManualRestoreResult> {
  let saved: T | null;
  try {
    saved = await read();
  } catch {
    return isCurrent() ? 'empty' : 'superseded';
  }
  if (!isCurrent()) return 'superseded';
  if (saved === null) return 'empty';
  apply(saved);
  return 'applied';
}
