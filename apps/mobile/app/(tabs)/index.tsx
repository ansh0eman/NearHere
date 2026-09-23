import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter, useSegments } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { HostAvatar } from '@/components/host-avatar';
import { avatarSeed } from '@/lib/avatar-identity';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useNearbyActivities } from '@/hooks/use-nearby-activities';
import { useNearbyLocation } from '@/hooks/use-nearby-location';
import { joinActivity } from '@/lib/activity-repository';
import { useAuth } from '@/providers/auth-provider';
import { useProfile } from '@/providers/profile-provider';
import type { ActivityFilter, ActivityKind, NearbyActivitySummary } from '@/types/activity';

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
  const { failure, failureMessage, label, refreshManualLocation, region, requestDeviceLocation, source, status: locationStatus } =
    useNearbyLocation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ActivityFilter>('all');
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [isBrowseOpen, setBrowseOpen] = useState(false);
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
    visibleActivities.find((activity) => activity.id === selectedId);

  useEffect(() => {
    if (visibleActivities.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!visibleActivities.some((activity) => activity.id === selectedId)) {
      setSelectedId(null);
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
      <MapView
        ref={mapRef}
        provider={PROVIDER_DEFAULT}
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        userInterfaceStyle="light"
        mapType={Platform.OS === 'ios' ? 'mutedStandard' : 'standard'}
        showsPointsOfInterest={false}
        showsBuildings={false}
        showsTraffic={false}
        showsUserLocation={source === 'device'}
        showsCompass={false}
        showsMyLocationButton={false}
        legalLabelInsets={{ top: 0, left: 16, right: 0, bottom: selected ? 350 : 170 }}
        toolbarEnabled={false}
        onPress={(event) => { if (event.nativeEvent.action !== 'marker-press') setSelectedId(null); }}>
        {visibleActivities.map((activity) => (
          <Marker
            key={activity.id}
            coordinate={activityCoordinate(activity)}
            accessibilityLabel={`${activity.title}, hosted by ${activity.hostDisplayName}. Approximate activity area.`}
            onPress={() => centerActivity(activity)}>
            <View style={styles.pin}>
              <View style={[styles.avatarPin, selectedId === activity.id && styles.selectedPin]}>
                <HostAvatar seed={activity.hostDisplayName} />
                <Text style={styles.activityBadge}>{KIND_EMOJIS[activity.kind]}</Text>
              </View>
              <View style={styles.pinShadow} />
            </View>
          </Marker>
        ))}
      </MapView>

      <SafeAreaView edges={['top']} pointerEvents="box-none" style={styles.topArea}>
        <View style={styles.topRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="Search or change area" onPress={openLocationPicker} style={styles.areaButton}>
            <View style={styles.areaDot} />
            <View style={styles.areaCopy}>
              <Text style={styles.wordmark}>nearhere</Text>
              <Text numberOfLines={1} style={styles.areaText}>{label}</Text>
            </View>
            <Ionicons name="chevron-down" size={15} color="#665E76" />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Open my profile" onPress={() => router.push('/me')} style={styles.profileButton}>
            <HostAvatar seed={avatarSeed(profileState.profile?.avatarConfig, session?.user.id ?? 'nearhere')} size={38} />
          </Pressable>
        </View>
      </SafeAreaView>

      <SafeAreaView edges={['bottom']} pointerEvents="box-none" style={styles.bottomArea}>
        <View style={styles.mapTools}>
          <Text style={styles.mapNote}>Activity areas · not live locations</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Center map on my location" onPress={() => void requestDeviceLocation()} style={styles.locateButton}>
            {locationStatus === 'requesting' ? <ActivityIndicator color="#6650AA" /> : <Ionicons name="locate-outline" size={20} color="#443759" />}
          </Pressable>
        </View>

        {failureMessage ? (
          <View style={styles.notice}>
            <Text style={styles.noticeText}>{failureMessage}</Text>
            <View style={{ flexDirection: 'row', gap: 20 }}>
              <Pressable accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }} onPress={() => {
                if (failure === 'permissionDenied' || failure === 'servicesDisabled') {
                  void Linking.openSettings().catch(() => Alert.alert('Open Settings', 'Open iPhone Settings and check NearHere location access.'));
                } else void requestDeviceLocation();
              }}><Text style={styles.noticeText}>{failure === 'fixUnavailable' ? 'Try again' : 'Open Settings'}</Text></Pressable>
              <Pressable accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }} onPress={openLocationPicker}><Text style={styles.noticeText}>Choose area</Text></Pressable>
            </View>
          </View>
        ) : null}

        {activityState.status === 'error' ? (
          <Pressable accessibilityRole="button" onPress={() => void refreshActivities()} style={styles.notice}>
            <Text style={styles.noticeText}>Couldn’t load activities. Tap to retry.</Text>
          </Pressable>
        ) : null}

        {selected ? (
          <View style={styles.selection}>
            <View style={styles.selectionTop}>
              <HostAvatar seed={selected.hostDisplayName} size={40} />
              <View style={styles.selectionCopy}>
                <Text style={styles.hostLabel}>With {selected.hostDisplayName}</Text>
                <Text numberOfLines={2} style={styles.selectionTitle}>{selected.title}</Text>
              </View>
              <Pressable accessibilityLabel="Dismiss selected activity" accessibilityRole="button" onPress={() => setSelectedId(null)} style={styles.closeButton}>
                <Ionicons name="close" size={19} color="#665E76" />
              </Pressable>
            </View>
            <Text style={styles.selectionMeta}>{formatStartsAt(selected.startsAt)} · {formatDistance(selected.distanceM)} · {selected.participantCount}/{selected.capacity} going</Text>
            <View style={styles.actions}>
              <Pressable accessibilityRole="button" onPress={openSelectedActivity} style={styles.detailsButton}><Text style={styles.detailsText}>View activity</Text></Pressable>
              <Pressable accessibilityRole="button" disabled={joiningId === selected.id} onPress={requireAuthenticationForJoin} style={styles.joinButton}>
                {joiningId === selected.id ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.joinText}>{selected.joinMode === 'approval' ? 'Request to join' : 'Join'}</Text>}
              </Pressable>
            </View>
          </View>
        ) : null}

        <View style={styles.dock}>
          <Pressable accessibilityRole="button" accessibilityLabel="Browse activities and filters" onPress={() => setBrowseOpen(true)} style={styles.browseButton}>
            <Text style={styles.browseTitle}>{activityState.status === 'loading' ? 'Looking nearby…' : visibleActivities.length ? `${visibleActivities.length} things to do` : 'Start something nearby'}</Text>
            <Text style={styles.browseHint}>{filter === 'all' ? 'Explore your neighbourhood' : `${filter} · change filter`}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Host an activity" onPress={requireAuthenticationForHosting} style={styles.hostButton}><Text style={styles.hostButtonText}>＋ Host</Text></Pressable>
        </View>
      </SafeAreaView>

      <Modal visible={isBrowseOpen} animationType="slide" onRequestClose={() => setBrowseOpen(false)}>
        <SafeAreaView style={styles.browseScreen}>
          <View style={styles.browseHeader}>
            <View><Text style={styles.wordmark}>Explore nearby</Text><Text style={styles.browseHint}>Find a little reason to go outside.</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Back to map" onPress={() => setBrowseOpen(false)} style={styles.closeButton}><Ionicons name="close" size={22} color="#302842" /></Pressable>
          </View>
          <View style={styles.filters}>
            <FilterPill label="All" active={filter === 'all'} onPress={() => selectFilter('all')} />
            <FilterPill label="Walks" active={filter === 'walk'} onPress={() => selectFilter('walk')} />
            <FilterPill label="Coffee" active={filter === 'coffee'} onPress={() => selectFilter('coffee')} />
            <FilterPill label="Sports" active={filter === 'sports'} onPress={() => selectFilter('sports')} />
          </View>
          <ScrollView contentContainerStyle={styles.listContent}>
            {activityState.status === 'loading' ? <ActivityIndicator color="#6650AA" /> : activityState.status === 'error' ? (
              <Pressable accessibilityRole="button" onPress={() => void refreshActivities()} style={styles.notice}><Text style={styles.noticeText}>Couldn’t load activities. Tap to retry.</Text></Pressable>
            ) : !visibleActivities.length ? <Text style={styles.emptyText}>Nothing here yet. Try another activity type or host the first one.</Text> : visibleActivities.map((activity) => (
              <Pressable key={activity.id} accessibilityRole="button" accessibilityLabel={`Show ${activity.title} on the map`} onPress={() => { setBrowseOpen(false); centerActivity(activity); }} style={styles.listRow}>
                <HostAvatar seed={activity.hostDisplayName} size={54} />
                <View style={styles.selectionCopy}>
                  <Text style={styles.hostLabel}>{KIND_EMOJIS[activity.kind]}  {activity.hostDisplayName}</Text>
                  <Text style={styles.listTitle}>{activity.title}</Text>
                  <Text style={styles.listMeta}>{formatStartsAt(activity.startsAt)} · {formatDistance(activity.distanceM)}</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable accessibilityRole="button" onPress={() => { setBrowseOpen(false); router.push('/plans'); }} style={styles.plansButton}><Text style={styles.detailsText}>Your plans</Text><Ionicons name="arrow-forward" color="#6650AA" size={18} /></Pressable>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

function FilterPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} style={[styles.filter, active && styles.filterActive]}><Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#EDF1EC' },
  topArea: { position: 'absolute', top: 0, left: 0, right: 0 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  areaButton: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', borderRadius: 23, paddingHorizontal: 16, paddingVertical: 11, maxWidth: '78%', shadowColor: '#302842', shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 4 } },
  areaDot: { height: 10, width: 10, borderRadius: 5, backgroundColor: '#A7DCC7' },
  areaCopy: { flexShrink: 1 },
  wordmark: { fontSize: 20, fontWeight: '900', color: '#302842', letterSpacing: -0.8 },
  areaText: { fontSize: 11, color: '#766D85', marginTop: 2 },
  profileButton: { backgroundColor: '#FFFFFF', padding: 5, borderRadius: 24 },
  pin: { alignItems: 'center', width: 70, height: 78 },
  avatarPin: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 3, borderWidth: 2, borderColor: '#FFFFFF' },
  selectedPin: { borderColor: '#7456BA', backgroundColor: '#F1EBFC' },
  activityBadge: { position: 'absolute', right: -5, bottom: -5, fontSize: 16, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 3, overflow: 'hidden' },
  pinShadow: { backgroundColor: 'rgba(48,40,66,0.16)', width: 23, height: 5, borderRadius: 12, marginTop: 7 },
  bottomArea: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16 },
  mapTools: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  mapNote: { color: '#514A61', backgroundColor: 'rgba(255,255,255,0.9)', fontSize: 10, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, overflow: 'hidden' },
  locateButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  dock: { backgroundColor: '#FFFFFF', borderRadius: 27, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8, shadowColor: '#302842', shadowOpacity: 0.1, shadowRadius: 18, shadowOffset: { width: 0, height: 5 } },
  browseButton: { flex: 1, minHeight: 44, justifyContent: 'center', paddingLeft: 3 },
  browseTitle: { color: '#302842', fontSize: 16, fontWeight: '800', letterSpacing: -0.4 },
  browseHint: { color: '#766D85', fontSize: 11, marginTop: 4 },
  hostButton: { backgroundColor: '#6B4FA6', paddingHorizontal: 19, minHeight: 46, borderRadius: 19, justifyContent: 'center' },
  hostButtonText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  notice: { backgroundColor: '#F3EFFA', padding: 14, borderRadius: 18, marginBottom: 10 },
  noticeText: { color: '#574477', fontSize: 12, lineHeight: 18 },
  selection: { backgroundColor: '#FFFFFF', borderRadius: 25, padding: 16, marginBottom: 10 },
  selectionTop: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  selectionCopy: { flex: 1 },
  hostLabel: { color: '#766D85', fontSize: 11 },
  selectionTitle: { color: '#302842', fontSize: 18, fontWeight: '800', marginTop: 4, letterSpacing: -0.4 },
  selectionMeta: { color: '#766D85', fontSize: 11, lineHeight: 18, marginTop: 12 },
  closeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: 12, alignItems: 'center', marginTop: 12 },
  detailsButton: { flex: 1, paddingVertical: 13 },
  detailsText: { fontSize: 13, fontWeight: '800', color: '#6650AA' },
  joinButton: { minHeight: 44, borderRadius: 16, paddingHorizontal: 24, backgroundColor: '#6B4FA6', alignItems: 'center', justifyContent: 'center' },
  joinText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  browseScreen: { flex: 1, backgroundColor: '#FAF9FD' },
  browseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingBottom: 16 },
  filter: { flex: 1, alignItems: 'center', paddingVertical: 13, borderRadius: 18, backgroundColor: '#EEEAF5' },
  filterActive: { backgroundColor: '#6B4FA6' },
  filterText: { color: '#665E76', fontSize: 12, fontWeight: '700' },
  filterTextActive: { color: '#FFFFFF' },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 20, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5DFEE' },
  listTitle: { color: '#302842', fontSize: 16, fontWeight: '800', marginTop: 4 },
  listMeta: { color: '#766D85', fontSize: 11, marginTop: 6 },
  emptyText: { color: '#766D85', fontSize: 15, lineHeight: 23, paddingVertical: 25 },
  plansButton: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, minHeight: 52 },
});
