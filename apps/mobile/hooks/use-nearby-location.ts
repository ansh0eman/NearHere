import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Region } from 'react-native-maps';

import { clearManualLocation, readManualLocation } from '@/lib/location-storage';
import { locationFailureMessage, resolveDeviceLocation, type LocationFailure } from '@/lib/device-location';
import { LocationSource, LocationStatus, ManualLocation } from '@/types/location';

export const DEFAULT_MAP_REGION: Region = {
  latitude: 12.9352,
  longitude: 77.6245,
  latitudeDelta: 0.035,
  longitudeDelta: 0.035,
};

function regionFromManualLocation(location: ManualLocation): Region {
  return {
    latitude: location.latitude,
    longitude: location.longitude,
    latitudeDelta: DEFAULT_MAP_REGION.latitudeDelta,
    longitudeDelta: DEFAULT_MAP_REGION.longitudeDelta,
  };
}

export function useNearbyLocation() {
  const [region, setRegion] = useState<Region>(DEFAULT_MAP_REGION);
  const [status, setStatus] = useState<LocationStatus>('loading');
  const [source, setSource] = useState<LocationSource>('default');
  const [label, setLabel] = useState('Bengaluru');
  const [failure, setFailure] = useState<LocationFailure | null>(null);
  const requestId = useRef(0);

  const applyManualLocation = useCallback((location: ManualLocation) => {
    requestId.current += 1;
    setFailure(null);
    setRegion(regionFromManualLocation(location));
    setStatus('ready');
    setSource('manual');
    setLabel(location.label);
  }, []);

  const refreshManualLocation = useCallback(async () => {
    const savedLocation = await readManualLocation();
    if (!savedLocation) return false;

    applyManualLocation(savedLocation);
    return true;
  }, [applyManualLocation]);

  const requestDeviceLocation = useCallback(async () => {
    const id = ++requestId.current;
    setStatus('requesting');
    setFailure(null);
    const result = await resolveDeviceLocation({
      servicesEnabled: Location.hasServicesEnabledAsync,
      permissionGranted: async () => (await Location.requestForegroundPermissionsAsync()).granted,
      current: () => Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      recent: () => Location.getLastKnownPositionAsync({ maxAge: 300_000, requiredAccuracy: 1000 }),
    });
    if (id !== requestId.current) return;
    if (result.ok) {
      // A storage failure must not masquerade as a GPS or permission failure.
      await clearManualLocation().catch(() => undefined);
      if (id !== requestId.current) return;
      setRegion({
        ...DEFAULT_MAP_REGION,
        latitude: result.point.coords.latitude,
        longitude: result.point.coords.longitude,
      });
      setStatus('ready');
      setSource('device');
      setLabel(result.cached ? 'Recent location' : 'Near you');
    } else {
      setStatus(result.reason === 'permissionDenied' ? 'denied' : 'error');
      setFailure(result.reason);
    }
  }, []);

  useEffect(() => {
    let isActive = true;

    async function initializeLocation() {
      try {
        const savedLocation = await readManualLocation();
        if (!isActive) return;

        if (savedLocation) {
          applyManualLocation(savedLocation);
          return;
        }

        await requestDeviceLocation();
      } catch {
        if (!isActive) return;
        await requestDeviceLocation();
      }
    }

    void initializeLocation();
    return () => {
      isActive = false;
      requestId.current += 1;
    };
  }, [applyManualLocation, requestDeviceLocation]);

  return {
    failure,
    failureMessage: failure ? locationFailureMessage(failure) : null,
    label,
    refreshManualLocation,
    region,
    requestDeviceLocation,
    source,
    status,
  };
}
