import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter, useSegments } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { HostAvatar } from '@/components/host-avatar';
import { ActivityMap, type ActivityMapHandle } from '@/components/map/activity-map';
import { avatarChoice, avatarSeed } from '@/lib/avatar-identity';
import { buildActivityMapFeatures, resolveSelectedActivity } from '@/lib/activity-map-features';
import { radii } from '@/constants/design-tokens';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useNearbyActivities } from '@/hooks/use-nearby-activities';
import { useNearbyLocation } from '@/hooks/use-nearby-location';
import { joinActivity } from '@/lib/activity-repository';
import { useAuth } from '@/providers/auth-provider';
import { useProfile } from '@/providers/profile-provider';
import { useTheme } from '@/providers/theme-provider';
import type { ActivityFilter, ActivityKind, NearbyActivitySummary } from '@/types/activity';

const KIND_LABELS: Record<ActivityKind, string> = {
  walk: 'Walk', coffee: 'Coffee', sports: 'Sports', study: 'Study',
  coworking: 'Coworking', creative: 'Creative', other: 'Neighbourhood plan',
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

function nearbyCountLabel(count: number) {
  return count === 1 ? '1 thing to do' : `${count} things to do`;
}

export default function NearbyScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const segments = useSegments();
  const mapRef = useRef<ActivityMapHandle>(null);
  const { pendingIntent, session, setPendingIntent } = useAuth();
  const { state: profileState } = useProfile();
  const { deviceLocation, failure, failureMessage, label, refreshManualLocation, region, requestDeviceLocation, source, status: locationStatus } =
    useNearbyLocation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ActivityFilter>('all');
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [isBrowseOpen, setBrowseOpen] = useState(false);
  const [mapAttempt, setMapAttempt] = useState(0);
  const [bottomOverlayHeight, setBottomOverlayHeight] = useState(0);
  const [mapStatus, setMapStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const joiningIdRef = useRef<string | null>(null);
  const hasInitiallyFocused = useRef(false);
  const { refresh: refreshActivities, state: activityState } = useNearbyActivities(
    region.latitude,
    region.longitude,
    filter,
  );

  const visibleActivities = activityState.activities;
  const activityFeatures = useMemo(() => buildActivityMapFeatures(visibleActivities), [visibleActivities]);

  useEffect(() => {
    mapRef.current?.easeTo([region.longitude, region.latitude], source === 'device' ? 13.8 : 12.8, 500);
  }, [region, source]);

  useFocusEffect(
    useCallback(() => {
      if (hasInitiallyFocused.current) void refreshManualLocation();
      else hasInitiallyFocused.current = true;
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

  const selected = resolveSelectedActivity(visibleActivities, selectedId);

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
    mapRef.current?.easeTo(
      [activityCoordinate(activity).longitude, activityCoordinate(activity).latitude],
      15,
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
    if (selected.viewerIsHost) {
      openSelectedActivity();
      return;
    }
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
      <ActivityMap
        key={mapAttempt}
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        features={activityFeatures}
        center={region}
        zoom={source === 'device' ? 13.8 : 12.8}
        selectedId={selectedId}
        deviceLocation={deviceLocation}
        bottomOverlayHeight={bottomOverlayHeight}
        onMapReady={() => setMapStatus('ready')}
        onMapError={() => setMapStatus('error')}
        onMapPress={() => setSelectedId(null)}
        onSelectActivity={setSelectedId}
      />

      {mapStatus === 'error' ? <View style={styles.mapError}>
        <Text style={styles.mapErrorText}>The map could not load. You can still browse the activity list.</Text>
        <Pressable accessibilityRole="button" onPress={() => {
          setMapStatus('loading');
          setMapAttempt((attempt) => attempt + 1);
        }} style={styles.mapRetry}>
          <Text style={styles.mapRetryText}>Retry map</Text>
        </Pressable>
      </View> : null}

      <SafeAreaView edges={['top']} pointerEvents="box-none" style={styles.topArea}>
        <View style={styles.topRow}>
          <Pressable accessibilityRole="button" accessibilityLabel="Search or change area" onPress={openLocationPicker} style={styles.areaButton}>
            <View style={styles.areaDot} />
            <View style={styles.areaCopy}>
              <Text style={styles.wordmark}>nearhere</Text>
              <Text numberOfLines={1} style={styles.areaText}>{label}</Text>
            </View>
            <Ionicons name="chevron-down" size={15} color={colors.mutedText} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Open my profile" onPress={() => router.push('/me')} style={styles.profileButton}>
            <HostAvatar
              seed={avatarSeed(profileState.profile?.avatarConfig, session?.user.id ?? 'nearhere')}
              avatarId={profileState.profile ? avatarChoice(profileState.profile.avatarConfig, profileState.profile.id) : undefined}
              size={38}
            />
          </Pressable>
        </View>
      </SafeAreaView>

      <SafeAreaView
        edges={['bottom']}
        pointerEvents="box-none"
        onLayout={(event) => {
          const height = event?.nativeEvent?.layout?.height;
          if (typeof height === 'number') {
            setBottomOverlayHeight((current) => current === height ? current : height);
          }
        }}
        style={styles.bottomArea}>
        <View style={styles.mapTools}>
          <View style={styles.mapNoteStack}>
            <Text style={styles.mapNote}>Activity areas, not live locations</Text>
            <Pressable
              accessibilityLabel="Show map data and tile-provider attribution"
              accessibilityRole="button"
              onPress={() => { void mapRef.current?.showAttribution(); }}
              style={styles.attributionButton}
            >
              <Text style={styles.mapAttribution}>Map data</Text>
            </Pressable>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Center map on my location" onPress={() => void requestDeviceLocation()} style={styles.locateButton}>
            {locationStatus === 'requesting' ? <ActivityIndicator color={colors.accent} /> : <Ionicons name="locate-outline" size={20} color={colors.text} />}
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
              <HostAvatar
                seed={avatarSeed(selected.hostAvatarConfig, selected.hostDisplayName)}
                avatarId={avatarChoice(selected.hostAvatarConfig, selected.hostDisplayName)}
                size={40}
              />
              <View style={styles.selectionCopy}>
              <Text style={styles.hostLabel}>{selected.viewerIsHost ? 'You are hosting' : `${KIND_LABELS[selected.kind]} · With ${selected.hostDisplayName}`}</Text>
                <Text numberOfLines={2} style={styles.selectionTitle}>{selected.title}</Text>
              </View>
              <Pressable accessibilityLabel="Dismiss selected activity" accessibilityRole="button" onPress={() => setSelectedId(null)} style={styles.closeButton}>
              <Ionicons name="close" size={19} color={colors.mutedText} />
              </Pressable>
            </View>
            <Text style={styles.selectionMeta}>{formatStartsAt(selected.startsAt)} · {formatDistance(selected.distanceM)} · {selected.participantCount}/{selected.capacity} going</Text>
            {selected.viewerIsHost ? (
              <Pressable accessibilityRole="button" onPress={openSelectedActivity} style={styles.manageButton}>
                <Text style={styles.manageButtonText}>Manage activity</Text>
              </Pressable>
            ) : (
              <View style={styles.actions}>
                <Pressable accessibilityRole="button" onPress={openSelectedActivity} style={styles.detailsButton}><Text style={styles.detailsText}>View activity</Text></Pressable>
                <Pressable accessibilityRole="button" disabled={joiningId === selected.id} onPress={requireAuthenticationForJoin} style={styles.joinButton}>
                  {joiningId === selected.id ? <ActivityIndicator color={colors.onAccent} /> : <Text style={styles.joinText}>{selected.joinMode === 'approval' ? 'Request to join' : 'Join'}</Text>}
                </Pressable>
              </View>
            )}
          </View>
        ) : null}

        <View style={styles.dock}>
          <Pressable accessibilityRole="button" accessibilityLabel="Browse activities and filters" onPress={() => { void refreshActivities(); setBrowseOpen(true); }} style={styles.browseButton}>
            <Text style={styles.browseTitle}>{activityState.status === 'loading' ? 'Looking nearby…' : visibleActivities.length ? nearbyCountLabel(visibleActivities.length) : 'Start something nearby'}</Text>
            <Text style={styles.browseHint}>{filter === 'all' ? 'Explore your neighbourhood' : `${filter} · change filter`}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Host an activity" onPress={requireAuthenticationForHosting} style={styles.hostButton}><Text style={styles.hostButtonText}>＋ Host</Text></Pressable>
        </View>
      </SafeAreaView>

      <Modal visible={isBrowseOpen} animationType="slide" onRequestClose={() => setBrowseOpen(false)}>
        <SafeAreaView style={styles.browseScreen}>
          <View style={styles.browseHeader}>
            <View><Text style={styles.wordmark}>Explore nearby</Text><Text style={styles.browseHint}>Find a little reason to go outside.</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Back to map" onPress={() => setBrowseOpen(false)} style={styles.closeButton}><Ionicons name="close" size={22} color={colors.text} /></Pressable>
          </View>
          <View style={styles.filters}>
            <FilterPill label="All" active={filter === 'all'} onPress={() => selectFilter('all')} />
            <FilterPill label="Walks" active={filter === 'walk'} onPress={() => selectFilter('walk')} />
            <FilterPill label="Coffee" active={filter === 'coffee'} onPress={() => selectFilter('coffee')} />
            <FilterPill label="Sports" active={filter === 'sports'} onPress={() => selectFilter('sports')} />
          </View>
          <ScrollView contentContainerStyle={styles.listContent}>
            {activityState.status === 'loading' ? <ActivityIndicator color={colors.accent} /> : activityState.status === 'error' ? (
              <Pressable accessibilityRole="button" onPress={() => void refreshActivities()} style={styles.notice}><Text style={styles.noticeText}>Couldn’t load activities. Tap to retry.</Text></Pressable>
            ) : !visibleActivities.length ? <Text style={styles.emptyText}>Nothing here yet. Try another activity type or host the first one.</Text> : visibleActivities.map((activity) => (
              <Pressable key={activity.id} accessibilityRole="button" accessibilityLabel={`Show ${activity.title} on the map`} onPress={() => { setBrowseOpen(false); centerActivity(activity); }} style={styles.listRow}>
                <HostAvatar
                  seed={avatarSeed(activity.hostAvatarConfig, activity.hostDisplayName)}
                  avatarId={avatarChoice(activity.hostAvatarConfig, activity.hostDisplayName)}
                  size={54}
                />
                <View style={styles.selectionCopy}>
                  <Text style={styles.hostLabel}>{activity.viewerIsHost ? 'You are hosting' : `${KIND_LABELS[activity.kind]} · ${activity.hostDisplayName}`}</Text>
                  <Text style={styles.listTitle}>{activity.title}</Text>
                  <Text style={styles.listMeta}>{formatStartsAt(activity.startsAt)} · {formatDistance(activity.distanceM)}</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable accessibilityRole="button" onPress={() => { setBrowseOpen(false); router.push('/plans'); }} style={styles.plansButton}><Text style={styles.detailsText}>Your plans</Text><Ionicons name="arrow-forward" color={colors.accent} size={18} /></Pressable>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

function FilterPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress} style={[styles.filter, active && styles.filterActive]}><Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text></Pressable>;
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  topArea: { position: 'absolute', top: 0, left: 0, right: 0 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  mapError: { position: 'absolute', top: 94, left: 18, right: 18, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 16 },
  mapErrorText: { flex: 1, color: colors.text, fontSize: 12, lineHeight: 17 },
  mapRetry: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 10 },
  mapRetryText: { color: colors.accent, fontSize: 12, fontWeight: '700' },
  areaButton: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radii.pill, paddingHorizontal: 16, paddingVertical: 11, maxWidth: '78%' },
  areaDot: { height: 8, width: 8, borderRadius: 4, backgroundColor: colors.accent },
  areaCopy: { flexShrink: 1 },
  wordmark: { fontSize: 20, fontWeight: '800', color: colors.text, letterSpacing: -0.8 },
  areaText: { fontSize: 11, color: colors.mutedText, marginTop: 2 },
  profileButton: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, padding: 5, borderRadius: 24 },
  bottomArea: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16 },
  mapTools: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  mapNoteStack: { flexShrink: 1, alignItems: 'flex-start', justifyContent: 'center', minHeight: 44 },
  mapNote: { color: colors.text, backgroundColor: `${colors.canvas}E8`, borderColor: colors.border, borderWidth: 1, fontSize: 10, fontWeight: '600', paddingHorizontal: 11, paddingVertical: 7, borderRadius: radii.pill, overflow: 'hidden' },
  attributionButton: { alignSelf: 'flex-start', justifyContent: 'center', minHeight: 20, marginTop: 2, paddingHorizontal: 8, borderRadius: radii.pill, backgroundColor: `${colors.canvas}E8` },
  mapAttribution: { color: colors.mutedText, fontSize: 9, lineHeight: 12 },
  locateButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  dock: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 25, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  browseButton: { flex: 1, minHeight: 44, justifyContent: 'center', paddingLeft: 3 },
  browseTitle: { color: colors.text, fontSize: 16, fontWeight: '700', letterSpacing: -0.4 },
  browseHint: { color: colors.mutedText, fontSize: 11, marginTop: 4 },
  hostButton: { backgroundColor: colors.accent, paddingHorizontal: 19, minHeight: 46, borderRadius: 18, justifyContent: 'center' },
  hostButtonText: { color: colors.onAccent, fontWeight: '700', fontSize: 14 },
  notice: { backgroundColor: colors.raised, borderColor: colors.border, borderWidth: 1, padding: 14, borderRadius: 18, marginBottom: 10 },
  noticeText: { color: colors.text, fontSize: 12, lineHeight: 18 },
  selection: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 25, padding: 16, marginBottom: 10 },
  selectionTop: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  selectionCopy: { flex: 1 },
  hostLabel: { color: colors.mutedText, fontSize: 11 },
  selectionTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: 4, letterSpacing: -0.4 },
  selectionMeta: { color: colors.mutedText, fontSize: 11, lineHeight: 18, marginTop: 12 },
  closeButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: colors.raised },
  actions: { flexDirection: 'row', gap: 12, alignItems: 'center', marginTop: 12 },
  detailsButton: { flex: 1, paddingVertical: 13 },
  detailsText: { fontSize: 13, fontWeight: '700', color: colors.accent },
  joinButton: { minHeight: 44, borderRadius: 16, paddingHorizontal: 24, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  joinText: { color: colors.onAccent, fontSize: 13, fontWeight: '700' },
  manageButton: { minHeight: 48, marginTop: 14, borderRadius: 16, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  manageButtonText: { color: colors.onAccent, fontSize: 14, fontWeight: '700' },
  browseScreen: { flex: 1, backgroundColor: colors.canvas },
  browseHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 42, paddingBottom: 20 },
  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingBottom: 16 },
  filter: { flex: 1, alignItems: 'center', paddingVertical: 13, borderRadius: 18, backgroundColor: colors.raised },
  filterActive: { backgroundColor: colors.accent },
  filterText: { color: colors.mutedText, fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: colors.onAccent },
  listContent: { paddingHorizontal: 20, paddingBottom: 20 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingVertical: 20, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  listTitle: { color: colors.text, fontSize: 16, fontWeight: '700', marginTop: 4 },
  listMeta: { color: colors.mutedText, fontSize: 11, marginTop: 6 },
  emptyText: { color: colors.mutedText, fontSize: 15, lineHeight: 23, paddingVertical: 25 },
  plansButton: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, minHeight: 52 },
  });
}
