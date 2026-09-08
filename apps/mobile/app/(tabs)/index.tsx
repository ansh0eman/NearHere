import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter, useSegments } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
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

import { useNearbyActivities } from '@/hooks/use-nearby-activities';
import { DEFAULT_MAP_REGION, useNearbyLocation } from '@/hooks/use-nearby-location';
import { joinActivity } from '@/lib/activity-repository';
import { useAuth } from '@/providers/auth-provider';
import { useProfile } from '@/providers/profile-provider';
import type { ActivityFilter, ActivityKind, NearbyActivitySummary } from '@/types/activity';

const KIND_COLORS: Record<ActivityKind, string> = {
  walk: '#FF6B4A',
  coffee: '#C2764B',
  sports: '#3E8E68',
  study: '#5867A8',
  coworking: '#7A5A9E',
  creative: '#C75B8B',
  other: '#66717D',
};

const KIND_EMOJIS: Record<ActivityKind, string> = {
  walk: '🚶',
  coffee: '☕',
  sports: '🏸',
  study: '📚',
  coworking: '💻',
  creative: '🎨',
  other: '✨',
};

function formatStartsAt(value: string) {
  const startsAt = new Date(value);
  const minutes = Math.round((startsAt.getTime() - Date.now()) / 60_000);
  if (minutes <= 0) return 'Starting now';
  if (minutes < 60) return `Starts in ${minutes} min`;
  if (minutes < 24 * 60) return `Starts in ${Math.round(minutes / 60)} hr`;
  return startsAt.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function formatDistance(distanceM: number) {
  return distanceM < 1000 ? `${Math.round(distanceM)} m away` : `${(distanceM / 1000).toFixed(1)} km away`;
}

export default function NearbyScreen() {
  const router = useRouter();
  const segments = useSegments();
  const mapRef = useRef<MapView>(null);
  const { pendingIntent, session, setPendingIntent } = useAuth();
  const { state: profileState } = useProfile();
  const { label, refreshManualLocation, region, requestDeviceLocation, source, status: locationStatus } =
    useNearbyLocation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ActivityFilter>('all');
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const joiningIdRef = useRef<string | null>(null);
  const { refresh: refreshActivities, state: activityState } = useNearbyActivities(
    region.latitude,
    region.longitude,
    filter,
  );

  useEffect(() => {
    mapRef.current?.animateToRegion(region, 500);
  }, [region]);

  useFocusEffect(
    useCallback(() => {
      void refreshManualLocation();
      void refreshActivities();
    }, [refreshActivities, refreshManualLocation]),
  );

  const performJoin = useCallback(
    async (activityId: string) => {
      if (joiningIdRef.current) return false;
      joiningIdRef.current = activityId;
      setJoiningId(activityId);
      try {
        const result = await joinActivity(activityId);
        if (!result.ok) {
          Alert.alert('Could not join', result.message);
          return false;
        }

        await refreshActivities();
        const messages = {
          accepted: 'You are going. The exact meeting point will be available to accepted participants.',
          pending: 'Your request was sent to the host.',
          waitlisted: 'The activity is full, so you joined the waitlist.',
        } as const;
        Alert.alert('Membership updated', messages[result.result.membershipStatus]);
        return true;
      } finally {
        joiningIdRef.current = null;
        setJoiningId(null);
      }
    },
    [refreshActivities],
  );

  useEffect(() => {
    // Auth and onboarding are modal routes rendered above this mounted tab.
    // Defer intent execution until the tabs are visible so two routes do not
    // race to replace each other during OTP/profile completion.
    if (segments[0] !== '(tabs)' || !session || !pendingIntent) return;

    // Every authenticated flow waits for profile resolution before consuming
    // its intent. The onboarding route is displayed above this tab screen, so
    // consuming openPlans/openAccount first would let the background map route
    // away from onboarding and lose the user's original destination.
    if (profileState.status === 'needsProfile') {
      router.push('/onboarding/profile');
      return;
    }
    if (profileState.status !== 'ready') return;

    if (pendingIntent.kind === 'openAccount') {
      setPendingIntent(null);
      router.replace('/me');
      return;
    }
    if (pendingIntent.kind === 'openPlans') {
      setPendingIntent(null);
      router.replace('/plans');
      return;
    }

    if (pendingIntent.kind === 'joinActivity') {
      void performJoin(pendingIntent.activityId).then((joined) => {
        if (!joined) return;
        const shouldReturnToActivity = pendingIntent.returnToActivity;
        setPendingIntent(null);
        if (shouldReturnToActivity) {
          router.push({ pathname: '/activity/[id]', params: { id: pendingIntent.activityId } });
        }
      });
      return;
    }

    setPendingIntent(null);

    router.push({
      pathname: '/host/create',
      params: { latitude: String(region.latitude), longitude: String(region.longitude) },
    });
  }, [pendingIntent, performJoin, profileState.status, region.latitude, region.longitude, router, segments, session, setPendingIntent]);

  const visibleActivities = activityState.activities;

  const selected =
    visibleActivities.find((activity) => activity.id === selectedId) ?? visibleActivities[0];

  useEffect(() => {
    if (visibleActivities.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!visibleActivities.some((activity) => activity.id === selectedId)) {
      setSelectedId(visibleActivities[0].id);
    }
  }, [selectedId, visibleActivities]);

  function selectFilter(nextFilter: ActivityFilter) {
    setFilter(nextFilter);
    setSelectedId(null);
  }

  function activityCoordinate(activity: NearbyActivitySummary) {
    return activity.publicLocation;
  }

  function centerActivity(activity: NearbyActivitySummary) {
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
      if (profileState.status === 'needsProfile') {
        setPendingIntent({ kind: 'joinActivity', activityId: selected.id });
        router.push('/onboarding/profile');
        return;
      }
      if (profileState.status !== 'ready') {
        Alert.alert('Profile is loading', 'Wait a moment and try joining again.');
        return;
      }
      void performJoin(selected.id);
      return;
    }

    setPendingIntent({ kind: 'joinActivity', activityId: selected.id });
    router.push('/auth/phone');
  }

  function openSelectedActivity() {
    if (!selected) return;
    router.push({
      pathname: '/activity/[id]',
      params: { distanceM: String(selected.distanceM), id: selected.id },
    });
  }

  function requireAuthenticationForHosting() {
    if (session) {
      if (profileState.status === 'needsProfile') {
        router.push('/onboarding/profile');
        return;
      }
      if (profileState.status !== 'ready') {
        Alert.alert('Profile is loading', 'Wait a moment and try hosting again.');
        return;
      }
      router.push({
        pathname: '/host/create',
        params: { latitude: String(region.latitude), longitude: String(region.longitude) },
      });
      return;
    }

    setPendingIntent({ kind: 'hostActivity' });
    router.push('/auth/phone');
  }

  return (
    <View style={styles.screen}>
      {viewMode === 'map' ? <MapView
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
                <Text style={styles.markerEmoji}>{KIND_EMOJIS[activity.kind]}</Text>
                <Text style={styles.markerCount}>{activity.participantCount}</Text>
              </View>
            </Marker>
          );
        })}
      </MapView> : (
        <View style={styles.listSurface}>
          <Text style={styles.listHeading}>Nearby activities</Text>
          <Text style={styles.listSubheading}>{visibleActivities.length ? `${visibleActivities.length} to explore` : 'Nothing live nearby yet'}</Text>
          <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
            {visibleActivities.map((activity) => (
              <Pressable key={activity.id} accessibilityRole="button" accessibilityLabel={`View ${activity.title}`} onPress={() => router.push({ pathname: '/activity/[id]', params: { distanceM: String(activity.distanceM), id: activity.id } })} style={styles.listRow}>
                <View style={[styles.listIcon, { backgroundColor: `${KIND_COLORS[activity.kind]}22` }]}><Text style={styles.listEmoji}>{KIND_EMOJIS[activity.kind]}</Text></View>
                <View style={styles.listCopy}><Text style={styles.listTitle}>{activity.title}</Text><Text style={styles.listMeta}>{formatDistance(activity.distanceM)} · {formatStartsAt(activity.startsAt)}</Text><Text style={styles.listHost}>Hosted by {activity.hostDisplayName}</Text></View>
                <Ionicons color="#8A929A" name="chevron-forward" size={18} />
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

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
            {locationStatus === 'loading' || locationStatus === 'requesting' ? (
              <ActivityIndicator size="small" color="#16202A" />
            ) : (
              <Ionicons name="locate" size={21} color="#16202A" />
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={viewMode === 'map' ? 'Show activities as a list' : 'Show activities on a map'}
            accessibilityState={{ selected: viewMode === 'list' }}
            onPress={() => setViewMode((mode) => mode === 'map' ? 'list' : 'map')}
            style={styles.iconButton}>
            <Ionicons name={viewMode === 'map' ? 'list' : 'map'} size={21} color="#16202A" />
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
          <FilterPill label="Sports" active={filter === 'sports'} onPress={() => selectFilter('sports')} />
        </ScrollView>
      </SafeAreaView>

      {(locationStatus === 'denied' || locationStatus === 'error') && (
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
          <View style={styles.liveDot} />
          <Text style={styles.prototypeText}>LIVE ACTIVITIES</Text>
        </View>

        {activityState.status === 'loading' ? (
          <View style={styles.emptyCard}>
            <ActivityIndicator color="#FF6B4A" />
            <Text style={styles.emptyTitle}>Looking nearby…</Text>
          </View>
        ) : activityState.status === 'error' ? (
          <View style={styles.emptyCard}>
            <Text style={styles.activityTitle}>Activities did not load</Text>
            <Text style={styles.activityDescription}>{activityState.message}</Text>
            <Pressable accessibilityRole="button" onPress={() => void refreshActivities()} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Try again</Text>
            </Pressable>
          </View>
        ) : selected ? (
          <View style={styles.activityCard}>
            <Pressable
              accessibilityHint="Opens full activity details"
              accessibilityLabel={`View ${selected.title}`}
              accessibilityRole="button"
              onPress={openSelectedActivity}
              style={({ pressed }) => pressed && styles.cardPressed}>
              <View style={styles.activityMetaRow}>
                <Text style={[styles.activityKind, { color: KIND_COLORS[selected.kind] }]}>
                  {selected.kind.toUpperCase()}
                </Text>
                <Text style={styles.startsIn}>{formatStartsAt(selected.startsAt)}</Text>
              </View>
              <Text style={styles.activityTitle}>{selected.title}</Text>
              <Text style={styles.activityDescription}>{selected.description}</Text>
              <View style={styles.detailRow}>
                <View style={styles.detailItem}>
                  <Ionicons name="walk-outline" size={17} color="#66717D" />
                  <Text style={styles.detailText}>{formatDistance(selected.distanceM)}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="people-outline" size={17} color="#66717D" />
                  <Text style={styles.detailText}>
                    {selected.participantCount}/{selected.capacity} going
                  </Text>
                </View>
              </View>
              <Text style={styles.hostText}>Hosted by {selected.hostDisplayName}</Text>
            </Pressable>
            <View style={styles.cardActions}>
              <Pressable accessibilityRole="button" onPress={openSelectedActivity} style={styles.detailsButton}>
                <Text style={styles.detailsButtonText}>View details</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={joiningId === selected.id}
                onPress={requireAuthenticationForJoin}
                style={styles.joinButton}>
                {joiningId === selected.id ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.joinButtonText}>Join activity</Text>
                    <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
                  </>
                )}
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.activityTitle}>Nothing live nearby yet</Text>
            <Text style={styles.activityDescription}>Be the first to host something in this area.</Text>
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
  listSurface: { backgroundColor: '#F7F4EE', flex: 1, paddingHorizontal: 18, paddingTop: 112 },
  listHeading: { color: '#16202A', fontSize: 30, fontWeight: '900', letterSpacing: -0.8 },
  listSubheading: { color: '#66717D', fontSize: 13, marginTop: 5 },
  listContent: { gap: 10, paddingBottom: 120, paddingTop: 22 },
  listRow: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: 'rgba(22,32,42,0.08)', borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: 12, padding: 13 },
  listIcon: { alignItems: 'center', borderRadius: 21, height: 42, justifyContent: 'center', width: 42 },
  listEmoji: { fontSize: 20 },
  listCopy: { flex: 1 },
  listTitle: { color: '#16202A', fontSize: 14, fontWeight: '900' },
  listMeta: { color: '#66717D', fontSize: 11, marginTop: 4 },
  listHost: { color: '#8A929A', fontSize: 10, marginTop: 4 },
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
  liveDot: { backgroundColor: '#3E8E68', borderRadius: 4, height: 7, width: 7 },
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
  cardPressed: { opacity: 0.72 },
  activityMetaRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  activityKind: { fontSize: 10, fontWeight: '900', letterSpacing: 1.3 },
  startsIn: { color: '#3E8E68', fontSize: 12, fontWeight: '800' },
  activityTitle: { color: '#16202A', fontSize: 22, fontWeight: '900', letterSpacing: -0.7, marginTop: 15 },
  activityDescription: { color: '#66717D', fontSize: 13, lineHeight: 19, marginTop: 5 },
  emptyTitle: { color: '#16202A', fontSize: 15, fontWeight: '900', marginTop: 12, textAlign: 'center' },
  detailRow: { flexDirection: 'row', gap: 16, marginTop: 14 },
  detailItem: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  detailText: { color: '#66717D', fontSize: 12, fontWeight: '700' },
  hostText: { color: '#89919A', fontSize: 11, fontWeight: '700', marginTop: 10 },
  cardActions: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 },
  detailsButton: { paddingHorizontal: 3, paddingVertical: 11 },
  detailsButtonText: { color: '#4D5A66', fontSize: 12, fontWeight: '900' },
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
  retryButton: { alignSelf: 'flex-start', backgroundColor: '#16202A', borderRadius: 999, marginTop: 14, paddingHorizontal: 16, paddingVertical: 10 },
  retryButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
});
