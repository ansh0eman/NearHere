import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PROTOTYPE_ACTIVITIES } from '@/data/prototype-activities';
import { DEFAULT_MAP_REGION, useNearbyLocation } from '@/hooks/use-nearby-location';
import { useAuth } from '@/providers/auth-provider';
import { Activity, ActivityFilter, ActivityKind } from '@/types/activity';

const KIND_COLORS: Record<ActivityKind, string> = {
  walk: '#FF6B4A',
  coffee: '#C2764B',
  sport: '#3E8E68',
};

export default function NearbyScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const { pendingIntent, session, setPendingIntent } = useAuth();
  const { label, refreshManualLocation, region, requestDeviceLocation, source, status } =
    useNearbyLocation();
  const [selectedId, setSelectedId] = useState(PROTOTYPE_ACTIVITIES[0].id);
  const [filter, setFilter] = useState<ActivityFilter>('all');

  useEffect(() => {
    mapRef.current?.animateToRegion(region, 500);
  }, [region]);

  useFocusEffect(
    useCallback(() => {
      void refreshManualLocation();
    }, [refreshManualLocation]),
  );

  useEffect(() => {
    if (!session || !pendingIntent) return;

    setPendingIntent(null);
    if (pendingIntent.kind === 'openAccount') {
      router.replace('/me');
      return;
    }

    if (pendingIntent.kind === 'joinActivity') {
      Alert.alert(
        'Identity verified',
        'NearHere restored your join intent. The capacity-safe activity endpoint is the next backend slice.',
      );
      return;
    }

    Alert.alert(
      'Identity verified',
      'NearHere restored your host intent. Activity creation is the next product slice.',
    );
  }, [pendingIntent, router, session, setPendingIntent]);

  const visibleActivities = useMemo(
    () => PROTOTYPE_ACTIVITIES.filter((activity) => filter === 'all' || activity.kind === filter),
    [filter],
  );

  const selected =
    visibleActivities.find((activity) => activity.id === selectedId) ?? visibleActivities[0];

  function selectFilter(nextFilter: ActivityFilter) {
    setFilter(nextFilter);
    const nextActivity = PROTOTYPE_ACTIVITIES.find(
      (activity) => nextFilter === 'all' || activity.kind === nextFilter,
    );
    if (nextActivity) setSelectedId(nextActivity.id);
  }

  function activityCoordinate(activity: Activity) {
    return {
      latitude: region.latitude + activity.latitudeOffset,
      longitude: region.longitude + activity.longitudeOffset,
    };
  }

  function centerActivity(activity: Activity) {
    setSelectedId(activity.id);
    mapRef.current?.animateToRegion(
      {
        ...activityCoordinate(activity),
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      },
      350,
    );
  }

  function openLocationPicker() {
    router.push({
      pathname: '/location-picker',
      params: {
        latitude: String(region.latitude),
        longitude: String(region.longitude),
      },
    });
  }

  function requireAuthenticationForJoin() {
    if (!selected) return;
    if (session) {
      Alert.alert(
        'Join endpoint is next',
        'Your identity is verified. The activity backend will perform the real capacity-safe join.',
      );
      return;
    }

    setPendingIntent({ kind: 'joinActivity', activityId: selected.id });
    router.push('/auth/phone');
  }

  function requireAuthenticationForHosting() {
    if (session) {
      Alert.alert('Host flow is next', 'Your identity is verified. Activity creation is the next product slice.');
      return;
    }

    setPendingIntent({ kind: 'hostActivity' });
    router.push('/auth/phone');
  }

  return (
    <View style={styles.screen}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={StyleSheet.absoluteFill}
        initialRegion={DEFAULT_MAP_REGION}
        showsUserLocation={source === 'device'}
        showsCompass={false}
        showsMyLocationButton={false}
        toolbarEnabled={false}>
        {visibleActivities.map((activity) => {
          const isSelected = activity.id === selected?.id;
          return (
            <Marker
              key={activity.id}
              coordinate={activityCoordinate(activity)}
              onPress={() => centerActivity(activity)}>
              <View style={[styles.marker, isSelected && styles.markerSelected]}>
                <Text style={styles.markerEmoji}>{activity.emoji}</Text>
                <Text style={styles.markerCount}>{activity.going}</Text>
              </View>
            </Marker>
          );
        })}
      </MapView>

      <SafeAreaView edges={['top']} style={styles.topArea} pointerEvents="box-none">
        <View style={styles.topRow}>
          <View style={styles.brandPill}>
            <View style={styles.brandMark}>
              <Ionicons name="sparkles" size={16} color="#FFFFFF" />
            </View>
            <Text style={styles.brandText}>NearHere</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Center map on my location"
            onPress={() => void requestDeviceLocation()}
            style={styles.iconButton}>
            {status === 'loading' || status === 'requesting' ? (
              <ActivityIndicator size="small" color="#16202A" />
            ) : (
              <Ionicons name="locate" size={21} color="#16202A" />
            )}
          </Pressable>
        </View>

        {source === 'manual' && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change selected area"
            onPress={openLocationPicker}
            style={styles.manualLocationPill}>
            <Ionicons name="location" size={14} color="#FF6B4A" />
            <Text style={styles.manualLocationText}>{label}</Text>
            <Ionicons name="chevron-forward" size={13} color="#66717D" />
          </Pressable>
        )}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}>
          <FilterPill label="All nearby" active={filter === 'all'} onPress={() => selectFilter('all')} />
          <FilterPill label="Walks" active={filter === 'walk'} onPress={() => selectFilter('walk')} />
          <FilterPill label="Coffee" active={filter === 'coffee'} onPress={() => selectFilter('coffee')} />
          <FilterPill label="Sports" active={filter === 'sport'} onPress={() => selectFilter('sport')} />
        </ScrollView>
      </SafeAreaView>

      {(status === 'denied' || status === 'error') && (
        <View style={styles.locationFallback}>
          <Ionicons name="location-outline" size={21} color="#16202A" />
          <View style={styles.locationFallbackCopy}>
            <Text style={styles.locationFallbackTitle}>Choose where to explore</Text>
            <Text style={styles.locationFallbackBody}>Location is off. The map is using Bengaluru for now.</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choose a different neighborhood"
            onPress={openLocationPicker}
            style={styles.changeButton}>
            <Text style={styles.changeButtonText}>Change</Text>
          </Pressable>
        </View>
      )}

      <View style={styles.bottomArea}>
        <View style={styles.prototypeLabel}>
          <View style={styles.prototypeDot} />
          <Text style={styles.prototypeText}>PROTOTYPE ACTIVITIES</Text>
        </View>

        {selected ? (
          <View style={styles.activityCard}>
            <View style={styles.activityMetaRow}>
              <Text style={[styles.activityKind, { color: KIND_COLORS[selected.kind] }]}>
                {selected.kind.toUpperCase()}
              </Text>
              <Text style={styles.startsIn}>Starts in {selected.startsIn}</Text>
            </View>
            <Text style={styles.activityTitle}>{selected.title}</Text>
            <Text style={styles.activityDescription}>{selected.description}</Text>
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Ionicons name="walk-outline" size={17} color="#66717D" />
                <Text style={styles.detailText}>{selected.distance}</Text>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="people-outline" size={17} color="#66717D" />
                <Text style={styles.detailText}>
                  {selected.going}/{selected.capacity} going
                </Text>
              </View>
            </View>
            <View style={styles.cardActions}>
              <View style={styles.avatarStack}>
                {['🦊', '🐸', '🌈'].map((avatar, index) => (
                  <View key={avatar} style={[styles.avatar, { marginLeft: index === 0 ? 0 : -8 }]}>
                    <Text>{avatar}</Text>
                  </View>
                ))}
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={requireAuthenticationForJoin}
                style={styles.joinButton}>
                <Text style={styles.joinButtonText}>Join activity</Text>
                <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.activityTitle}>Nothing in this filter yet</Text>
            <Text style={styles.activityDescription}>Try another activity type.</Text>
          </View>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Host an activity"
          onPress={requireAuthenticationForHosting}
          style={styles.hostButton}>
          <Ionicons name="add" size={23} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
  );
}

function FilterPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.filterPill, active && styles.filterPillActive]}>
      <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#DCEBDC' },
  topArea: { position: 'absolute', left: 0, right: 0, top: 0 },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  brandPill: {
    alignItems: 'center',
    backgroundColor: 'rgba(247,244,238,0.96)',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 8,
    padding: 7,
    paddingRight: 14,
    shadowColor: '#16202A',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  brandMark: {
    alignItems: 'center',
    backgroundColor: '#16202A',
    borderRadius: 12,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  brandText: { color: '#16202A', fontSize: 16, fontWeight: '900', letterSpacing: -0.4 },
  iconButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(247,244,238,0.96)',
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44,
    shadowColor: '#16202A',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  filters: { gap: 8, paddingHorizontal: 16, paddingTop: 12 },
  manualLocationPill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(247,244,238,0.96)',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 5,
    marginLeft: 16,
    marginTop: 8,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  manualLocationText: { color: '#16202A', fontSize: 11, fontWeight: '800' },
  filterPill: {
    backgroundColor: 'rgba(247,244,238,0.96)',
    borderColor: 'rgba(22,32,42,0.12)',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  filterPillActive: { backgroundColor: '#16202A', borderColor: '#16202A' },
  filterText: { color: '#16202A', fontSize: 13, fontWeight: '800' },
  filterTextActive: { color: '#FFFFFF' },
  marker: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 2,
    flexDirection: 'row',
    gap: 3,
    paddingHorizontal: 9,
    paddingVertical: 7,
    shadowColor: '#16202A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 7,
    elevation: 4,
  },
  markerSelected: { borderColor: '#FF6B4A', transform: [{ scale: 1.08 }] },
  markerEmoji: { fontSize: 17 },
  markerCount: {
    backgroundColor: '#FF6B4A',
    borderRadius: 10,
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    minWidth: 20,
    overflow: 'hidden',
    paddingHorizontal: 5,
    paddingVertical: 2,
    textAlign: 'center',
  },
  locationFallback: {
    alignItems: 'center',
    backgroundColor: '#FFF9E8',
    borderColor: '#E9DDB9',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    left: 16,
    padding: 13,
    position: 'absolute',
    right: 16,
    top: 152,
  },
  locationFallbackCopy: { flex: 1 },
  locationFallbackTitle: { color: '#16202A', fontSize: 13, fontWeight: '900' },
  locationFallbackBody: { color: '#66717D', fontSize: 11, lineHeight: 16, marginTop: 2 },
  changeButton: { padding: 8 },
  changeButtonText: { color: '#DB4C2F', fontSize: 12, fontWeight: '900' },
  bottomArea: { bottom: 12, left: 12, position: 'absolute', right: 12 },
  prototypeLabel: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  prototypeDot: { backgroundColor: '#FF6B4A', borderRadius: 4, height: 7, width: 7 },
  prototypeText: { color: '#66717D', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  activityCard: {
    backgroundColor: '#F7F4EE',
    borderColor: 'rgba(22,32,42,0.1)',
    borderRadius: 26,
    borderWidth: 1,
    padding: 19,
    shadowColor: '#16202A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 20,
    elevation: 8,
  },
  activityMetaRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  activityKind: { fontSize: 10, fontWeight: '900', letterSpacing: 1.3 },
  startsIn: { color: '#3E8E68', fontSize: 12, fontWeight: '800' },
  activityTitle: { color: '#16202A', fontSize: 22, fontWeight: '900', letterSpacing: -0.7, marginTop: 15 },
  activityDescription: { color: '#66717D', fontSize: 13, lineHeight: 19, marginTop: 5 },
  detailRow: { flexDirection: 'row', gap: 16, marginTop: 14 },
  detailItem: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  detailText: { color: '#66717D', fontSize: 12, fontWeight: '700' },
  cardActions: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 },
  avatarStack: { alignItems: 'center', flexDirection: 'row' },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#BFE9D4',
    borderColor: '#F7F4EE',
    borderRadius: 17,
    borderWidth: 2,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  joinButton: {
    alignItems: 'center',
    backgroundColor: '#FF6B4A',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  joinButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  hostButton: {
    alignItems: 'center',
    backgroundColor: '#16202A',
    borderColor: '#F7F4EE',
    borderRadius: 27,
    borderWidth: 3,
    height: 54,
    justifyContent: 'center',
    position: 'absolute',
    right: 12,
    top: -70,
    width: 54,
    shadowColor: '#16202A',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  emptyCard: { backgroundColor: '#F7F4EE', borderRadius: 26, padding: 20 },
});
