export type LocationFailure = 'servicesDisabled' | 'permissionDenied' | 'fixUnavailable';
type Point = { coords: { latitude: number; longitude: number } };
type Provider = {
  servicesEnabled(): Promise<boolean>;
  permissionGranted(): Promise<boolean>;
  current(): Promise<Point>;
  recent(): Promise<Point | null>;
};

/** Permission is not a GPS fix. Bound the wait and label cached fixes honestly. */
export async function resolveDeviceLocation(provider: Provider, timeoutMs = 12_000): Promise<
  { ok: true; point: Point; cached: boolean } | { ok: false; reason: LocationFailure }
> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    if (!await provider.servicesEnabled()) return { ok: false, reason: 'servicesDisabled' };
    if (!await provider.permissionGranted()) return { ok: false, reason: 'permissionDenied' };
    try {
      const point = await Promise.race([
        provider.current(),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), timeoutMs); }),
      ]);
      return { ok: true, point, cached: false };
    } catch {
      const point = await provider.recent();
      return point ? { ok: true, point, cached: true } : { ok: false, reason: 'fixUnavailable' };
    }
  } catch {
    return { ok: false, reason: 'fixUnavailable' };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function locationFailureMessage(reason: LocationFailure): string {
  switch (reason) {
    case 'servicesDisabled': return 'Location Services are off. Enable them in iPhone Settings, or choose an area.';
    case 'permissionDenied': return 'NearHere needs location permission. Allow access in Settings, or choose an area.';
    case 'fixUnavailable': return 'No location fix yet. Your selected area is unchanged. Try again, or choose an area.';
  }
}
