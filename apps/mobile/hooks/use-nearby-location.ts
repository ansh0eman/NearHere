import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import { Region } from 'react-native-maps';

import { clearManualLocation, readManualLocation } from '@/lib/location-storage';
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

  const applyManualLocation = useCallback((location: ManualLocation) => {
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
    setStatus('requesting');

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        setStatus('denied');
        setSource('default');
        setLabel('Bengaluru');
        return;
      }

      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      await clearManualLocation();
      setRegion({
        ...DEFAULT_MAP_REGION,
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      });
      setStatus('ready');
      setSource('device');
      setLabel('Near you');
    } catch {
      setStatus('error');
      setSource('default');
      setLabel('Bengaluru');
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
        setStatus('error');
      }
    }

    void initializeLocation();
    return () => {
      isActive = false;
    };
  }, [applyManualLocation, requestDeviceLocation]);

  return {
    label,
    refreshManualLocation,
    region,
    requestDeviceLocation,
    source,
    status,
  };
}
