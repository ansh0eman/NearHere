import {
  Camera,
  Map as MapLibreMap,
  type CameraRef,
  type ViewStateChangeEvent,
} from '@maplibre/maplibre-react-native';
import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { makeMapStyle } from '@/lib/map-style';
import { useTheme } from '@/providers/theme-provider';

export type SelectionMapHandle = {
  moveTo(center: [longitude: number, latitude: number], zoom: number, duration: number): void;
};

type SelectionMapProps = {
  center: [longitude: number, latitude: number];
  zoom: number;
  style?: StyleProp<ViewStyle>;
  onViewportChange(center: [longitude: number, latitude: number], userInteraction: boolean): void;
  onReady?(): void;
  onError?(): void;
};

/** The same authored NearHere basemap in both manual-area and private-pin flows. */
export const SelectionMap = forwardRef<SelectionMapHandle, SelectionMapProps>(function SelectionMap(
  { center, zoom, style, onViewportChange, onReady, onError },
  forwardedRef,
) {
  const mapRef = useRef<React.ElementRef<typeof MapLibreMap>>(null);
  const cameraRef = useRef<CameraRef>(null);
  const { mode } = useTheme();
  const mapStyle = useMemo(() => makeMapStyle(mode), [mode]);

  useImperativeHandle(forwardedRef, () => ({
    moveTo(nextCenter, nextZoom, duration) {
      cameraRef.current?.easeTo({ center: nextCenter, zoom: nextZoom, duration });
    },
  }), []);

  function handleRegionChange(event: { nativeEvent?: ViewStateChangeEvent }) {
    const nativeEvent = event?.nativeEvent;
    const nextCenter = nativeEvent?.center;
    if (!nativeEvent || !Array.isArray(nextCenter) || nextCenter.length !== 2
      || !Number.isFinite(nextCenter[0]) || !Number.isFinite(nextCenter[1])) return;
    onViewportChange([nextCenter[0], nextCenter[1]], nativeEvent.userInteraction === true);
  }

  return (
    <View style={style}>
      <MapLibreMap
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        mapStyle={mapStyle}
        attribution
        logo
        compass={false}
        scaleBar={false}
        onDidFinishLoadingMap={onReady}
        onDidFailLoadingMap={onError}
        onRegionDidChange={handleRegionChange}>
        <Camera ref={cameraRef} initialViewState={{ center, zoom }} />
      </MapLibreMap>
    </View>
  );
});
