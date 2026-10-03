import {
  Camera,
  GeoJSONSource,
  Images,
  Layer,
  Map as MapLibreMap,
  type CameraRef,
} from '@maplibre/maplibre-react-native';
import type { FeatureCollection, Point } from 'geojson';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/providers/theme-provider';
import { makeMapStyle } from '@/lib/map-style';
import { AVATAR_RENDER_CATALOG } from '@/lib/avatar-catalog';
import { cameraBottomPadding, cameraMotionDuration, shouldShowSelectedMapLabel, type ActivityMapProperties } from '@/lib/activity-map-features';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

export interface ActivityMapHandle {
  easeTo(center: [number, number], zoom: number, duration: number): void;
  showAttribution(): void;
}

export interface ActivityMapProps {
  features: FeatureCollection<Point, ActivityMapProperties>;
  center: { latitude: number; longitude: number };
  zoom: number;
  selectedId: string | null;
  deviceLocation: { latitude: number; longitude: number } | null;
  bottomOverlayHeight: number;
  style?: StyleProp<ViewStyle>;
  onMapPress(): void;
  onSelectActivity(activityId: string): void;
  onMapReady(): void;
  onMapError(): void;
}

/** Native MapLibre boundary: rendering and camera gestures only, no data writes. */
export const ActivityMap = forwardRef<ActivityMapHandle, ActivityMapProps>(function ActivityMap(
  {
    features,
    center,
    zoom,
    selectedId,
    deviceLocation,
    bottomOverlayHeight,
    style,
    onMapPress,
    onSelectActivity,
    onMapReady,
    onMapError,
  },
  forwardedRef,
) {
  const mapRef = useRef<React.ElementRef<typeof MapLibreMap>>(null);
  const { colors, mode } = useTheme();
  const reduceMotion = useReducedMotion();
  const reduceMotionRef = useRef(reduceMotion);
  reduceMotionRef.current = reduceMotion;
  const mapStyle = useMemo(() => makeMapStyle(mode), [mode]);
  const cameraRef = useRef<CameraRef>(null);
  const sourceRef = useRef<React.ElementRef<typeof GeoJSONSource>>(null);
  const [mapHeight, setMapHeight] = useState(0);
  const [isMapReady, setIsMapReady] = useState(false);
  const mapReadyRef = useRef(false);
  const bottomPadding = cameraBottomPadding(bottomOverlayHeight, mapHeight);
  const showSelectedLabel = shouldShowSelectedMapLabel(features, selectedId);
  const bottomPaddingRef = useRef(bottomPadding);
  bottomPaddingRef.current = bottomPadding;
  const avatarImages = useMemo(() => Object.fromEntries(
    AVATAR_RENDER_CATALOG.map((avatar) => [`avatar-${avatar.id}`, avatar.source]),
  ), []);

  const moveCamera = useCallback((nextCenter: [number, number], nextZoom: number, requestedDuration: number) => {
    const camera = cameraRef.current;
    if (!camera) return;
    const padding = { top: 0, left: 0, right: 0, bottom: bottomPaddingRef.current };
    const duration = cameraMotionDuration(requestedDuration, reduceMotionRef.current);
    if (duration === 0) camera.jumpTo({ center: nextCenter, zoom: nextZoom, padding });
    else camera.easeTo({ center: nextCenter, zoom: nextZoom, duration, padding });
  }, []);

  useImperativeHandle(forwardedRef, () => ({
    easeTo: (nextCenter, nextZoom, duration) => {
      if (!mapReadyRef.current) return;
      moveCamera(nextCenter, nextZoom, duration);
    },
    showAttribution: () => { void mapRef.current?.showAttribution(); },
  }), [moveCamera]);

  useEffect(() => {
    if (!isMapReady) return;
    moveCamera([center.longitude, center.latitude], zoom, 500);
  }, [bottomPadding, center.latitude, center.longitude, isMapReady, moveCamera, reduceMotion, zoom]);

  function handleMapReady() {
    mapReadyRef.current = true;
    setIsMapReady(true);
    onMapReady();
  }

  function onMapLayout(event: LayoutChangeEvent) {
    const height = event?.nativeEvent?.layout?.height;
    if (typeof height === 'number') {
      setMapHeight((current) => current === height ? current : height);
    }
  }

  const locationFeature = useMemo<FeatureCollection<Point>>(() => ({
    type: 'FeatureCollection',
    features: deviceLocation ? [{
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [deviceLocation.longitude, deviceLocation.latitude] },
      properties: {},
    }] : [],
  }), [deviceLocation]);

  return (
    <View onLayout={onMapLayout} style={style}>
      <MapLibreMap
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        mapStyle={mapStyle}
        attribution
        logo
        compass={false}
        scaleBar={false}
        onDidFinishLoadingMap={handleMapReady}
        onDidFailLoadingMap={onMapError}
        onPress={onMapPress}>
        <Camera ref={cameraRef} initialViewState={{
          center: [center.longitude, center.latitude],
          zoom,
          padding: { top: 0, left: 0, right: 0, bottom: bottomPadding },
        }} />
        <Images images={avatarImages} />
        <GeoJSONSource
          id="nearby-activities"
          ref={sourceRef}
          data={features}
          cluster
          clusterRadius={58}
          clusterMaxZoom={15}
          onPress={(event) => {
            event.stopPropagation();
            const feature = event.nativeEvent.features[0];
            if (!feature) return;
            const coordinates = feature.geometry.type === 'Point' ? feature.geometry.coordinates : null;
            const properties = feature.properties ?? {};
            if (typeof properties.point_count === 'number' && typeof properties.cluster_id === 'number' && coordinates) {
              void sourceRef.current?.getClusterExpansionZoom(properties.cluster_id).then((nextZoom) => {
                if (!mapReadyRef.current) return;
                moveCamera([coordinates[0], coordinates[1]], nextZoom, 450);
              });
              return;
            }
            if (typeof properties.activityId === 'string') onSelectActivity(properties.activityId);
          }}>
          <Layer
            id="activity-clusters"
            type="circle"
            filter={['has', 'point_count']}
            paint={{ 'circle-color': colors.accent, 'circle-radius': ['step', ['get', 'point_count'], 18, 8, 22, 20, 27], 'circle-stroke-color': colors.canvas, 'circle-stroke-width': 2 }}
          />
          <Layer
            id="activity-cluster-count"
            type="symbol"
            filter={['has', 'point_count']}
            layout={{ 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 13, 'text-font': ['Noto Sans Bold'] }}
            paint={{ 'text-color': colors.onAccent }}
          />
          {/* Keep this layer mounted; conditional identity changes break MapLibre. */}
          <Layer
            id="selected-activity-halo"
            type="circle"
            filter={['all', ['!', ['has', 'point_count']], ['==', ['get', 'activityId'], selectedId ?? '']]}
            paint={{ 'circle-color': colors.accent, 'circle-opacity': 0.22, 'circle-radius': 30, 'circle-stroke-color': colors.accent, 'circle-stroke-width': 2 }}
          />
          <Layer
            id="activity-avatar-pedestals"
            type="circle"
            filter={['!', ['has', 'point_count']]}
            paint={{
              'circle-color': colors.surface,
              'circle-radius': ['case', ['==', ['get', 'activityId'], selectedId ?? ''], 31, 25],
              'circle-stroke-color': ['case', ['==', ['get', 'activityId'], selectedId ?? ''], colors.accent, colors.border],
              'circle-stroke-width': ['case', ['==', ['get', 'activityId'], selectedId ?? ''], 3, 2],
            }}
          />
          <Layer
            id="activity-avatars"
            type="symbol"
            filter={['!', ['has', 'point_count']]}
            layout={{
              'icon-image': ['get', 'avatarIcon'],
              'icon-size': ['case', ['==', ['get', 'activityId'], selectedId ?? ''], 0.16, 0.125],
              'icon-anchor': 'bottom',
              'icon-allow-overlap': true,
              // Keep every avatar visible, but reserve its footprint so text
              // labels in the following layer yield instead of covering it.
              'icon-ignore-placement': false,
              'icon-padding': 2,
            }}
          />
          <Layer
            id="activity-labels"
            type="symbol"
            // Keep the map quiet at browse density. Only the selected activity
            // gets a cue; its full title and actions remain in the bottom card.
            minzoom={12}
            filter={showSelectedLabel
              ? ['all', ['!', ['has', 'point_count']], ['==', ['get', 'activityId'], selectedId ?? '']]
              : ['==', ['get', 'activityId'], '']}
            layout={{
              'text-field': ['get', 'mapLabel'],
              'text-font': ['Noto Sans Bold'],
              'text-size': 11,
              'text-variable-anchor': ['top', 'left', 'right'],
              'text-offset': [0, 2.8],
              'text-justify': 'auto',
              'text-padding': 6,
              'text-allow-overlap': false,
              'text-ignore-placement': false,
            }}
            paint={{
              'text-color': colors.text,
              'text-halo-color': colors.surface,
              'text-halo-width': 2,
            }}
          />
        </GeoJSONSource>
        <GeoJSONSource id="my-location" data={locationFeature}>
          <Layer id="my-location-halo" type="circle" paint={{ 'circle-radius': 11, 'circle-color': '#62B7FF', 'circle-opacity': 0.24 }} />
          <Layer id="my-location-dot" type="circle" paint={{ 'circle-radius': 5, 'circle-color': '#62B7FF', 'circle-stroke-color': colors.surface, 'circle-stroke-width': 2 }} />
        </GeoJSONSource>
      </MapLibreMap>
    </View>
  );
});
