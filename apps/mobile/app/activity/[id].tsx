import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useActivityDetail } from '@/hooks/use-activity-detail';
import { cancelActivity, getHostActivityParticipants, joinActivity, leaveActivity, removeActivityParticipant, reportActivity } from '@/lib/activity-repository';
import { useAuth } from '@/providers/auth-provider';
import { useProfile } from '@/providers/profile-provider';
import type { ActivityDetail, ActivityKind, HostActivityParticipant } from '@/types/activity';

const KIND_EMOJIS: Record<ActivityKind, string> = {
  coffee: '☕',
  coworking: '💻',
  creative: '🎨',
  other: '✨',
  sports: '🏸',
  study: '📚',
  walk: '🚶',
};

const MEMBERSHIP_LABELS: Partial<Record<NonNullable<ActivityDetail['membershipStatus']>, string>> = {
  accepted: 'You are going',
  pending: 'Waiting for host approval',
  rejected: 'Request declined',
  removed: 'Participation unavailable',
  waitlisted: 'You are on the waitlist',
};

function formatFullTime(startsAt: string, endsAt: string) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const date = start.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
    year: 'numeric',
  });
  const startTime = start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const endTime = end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${date} · ${startTime}–${endTime}`;
}

function formatDistance(distanceM: number | null) {
  if (distanceM === null) return null;
  return distanceM < 1000
    ? `${Math.round(distanceM)} m from your search area`
    : `${(distanceM / 1000).toFixed(1)} km from your search area`;
}

function actionLabel(activity: ActivityDetail) {
  if (activity.membershipStatus === 'pending') return 'Withdraw request';
  if (activity.membershipStatus === 'waitlisted') return 'Leave waitlist';
  if (activity.membershipStatus === 'accepted') return 'Leave activity';
  if (activity.joinMode === 'approval') return 'Request to join';
  if (activity.participantCount >= activity.capacity) return 'Join waitlist';
  return activity.membershipStatus === 'left' ? 'Join again' : 'Join activity';
}

export default function ActivityDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; distanceM?: string }>();
  const activityId = typeof params.id === 'string' ? params.id : '';
  const parsedDistance = Number(params.distanceM);
  const distanceM = Number.isFinite(parsedDistance) && parsedDistance >= 0 ? parsedDistance : null;
  const { session, setPendingIntent } = useAuth();
  const { state: profileState } = useProfile();
  const { redactExactLocation, refresh, state } = useActivityDetail(
    activityId,
    session?.user.id ?? null,
  );
  const [action, setAction] = useState<'cancel' | 'join' | 'leave' | 'remove' | null>(null);
  const [participants, setParticipants] = useState<HostActivityParticipant[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const actionRef = useRef<typeof action>(null);

  useFocusEffect(
    useCallback(() => {
      if (activityId) void refresh();
    }, [activityId, refresh]),
  );

  const activity = state.activity;
  const hasEnded = activity ? Date.parse(activity.endsAt) <= Date.now() : false;
  const isInactive = activity ? activity.status !== 'published' || hasEnded : false;
  const isHost = activity?.membershipRole === 'host';
  const refreshParticipants = useCallback(async () => {
    if (!activityId || !isHost) return;
    const result = await getHostActivityParticipants(activityId);
    if (result.ok) setParticipants(result.participants);
  }, [activityId, isHost]);

  useFocusEffect(useCallback(() => { void refreshParticipants(); }, [refreshParticipants]));
  const canLeave = activity?.membershipRole === 'participant'
    && ['accepted', 'pending', 'waitlisted'].includes(activity.membershipStatus ?? '')
    && !isInactive;
  const canJoin = activity
    && !isInactive
    && (activity.membershipStatus === null || activity.membershipStatus === 'left');
  const membershipLabel = useMemo(() => {
    if (!activity) return null;
    if (activity.status === 'cancelled') return 'Activity cancelled';
    if (hasEnded || activity.status === 'completed') return 'Activity ended';
    if (isHost) return 'You are hosting';
    if (activity.membershipStatus === 'left') return 'You left this activity';
    return activity.membershipStatus ? MEMBERSHIP_LABELS[activity.membershipStatus] : null;
  }, [activity, hasEnded, isHost]);

  async function performJoin() {
    if (!activity || actionRef.current) return;
    actionRef.current = 'join';
    setAction('join');
    setActionError(null);
    setActionNotice(null);
    const result = await joinActivity(activity.id);
    actionRef.current = null;
    setAction(null);
    if (!result.ok) {
      setActionError(result.message);
      return;
    }
    const notices = {
      accepted: 'You are going. Your private meeting point is now available below.',
      pending: 'Your request was sent to the host.',
      waitlisted: 'This activity is full, so you joined the waitlist.',
    } as const;
    setActionNotice(notices[result.result.membershipStatus]);
    await refresh();
  }

  function beginJoin() {
    if (!activity) return;
    if (!session) {
      setPendingIntent({ kind: 'joinActivity', activityId: activity.id, returnToActivity: true });
      router.push('/auth/phone');
      return;
    }
    if (profileState.status === 'needsProfile') {
      setPendingIntent({ kind: 'joinActivity', activityId: activity.id, returnToActivity: true });
      router.push('/onboarding/profile');
      return;
    }
    if (profileState.status !== 'ready') {
      Alert.alert('Profile is loading', 'Wait a moment and try joining again.');
      return;
    }
    void performJoin();
  }

  async function performLeave() {
    if (!activity || actionRef.current) return;
    actionRef.current = 'leave';
    setAction('leave');
    setActionError(null);
    setActionNotice(null);
    // Hide privileged coordinates before the network request begins. A stale
    // response cannot repaint them because the hook invalidates in-flight reads.
    redactExactLocation();
    const result = await leaveActivity(activity.id);
    actionRef.current = null;
    setAction(null);
    if (!result.ok) {
      setActionError(result.message);
      await refresh();
      return;
    }
    setActionNotice(
      activity.membershipStatus === 'pending'
        ? 'Your join request was withdrawn.'
        : activity.membershipStatus === 'waitlisted'
          ? 'You left the waitlist.'
          : 'You left the activity. Private meeting access was removed.',
    );
    await refresh();
  }

  function confirmLeave() {
    if (!activity) return;
    Alert.alert(
      `${actionLabel(activity)}?`,
      activity.membershipStatus === 'accepted'
        ? 'You will immediately lose access to the private meeting point.'
        : 'You can try to join again later if the activity is still available.',
      [
        { text: 'Keep plan', style: 'cancel' },
        { text: actionLabel(activity), style: 'destructive', onPress: () => void performLeave() },
      ],
    );
  }

  async function performCancel() {
    if (!activity || actionRef.current) return;
    actionRef.current = 'cancel';
    setAction('cancel');
    setActionError(null);
    setActionNotice(null);
    redactExactLocation();
    const result = await cancelActivity(activity.id);
    actionRef.current = null;
    setAction(null);
    if (!result.ok) {
      setActionError(result.message);
      await refresh();
      return;
    }
    setActionNotice('Activity cancelled. Participants can no longer access the meeting point.');
    await refresh();
  }

  async function performRemove(participant: HostActivityParticipant) {
    if (!activity || actionRef.current) return;
    actionRef.current = 'remove';
    setAction('remove');
    setActionError(null);
    setActionNotice(null);
    const result = await removeActivityParticipant(activity.id, participant.participantUserId);
    actionRef.current = null;
    setAction(null);
    if (!result.ok) { setActionError(result.message); return; }
    setActionNotice(`${participant.participantDisplayName} was removed from the activity.`);
    await refreshParticipants();
    await refresh();
  }

  function confirmReport() {
    if (!activity || !session) {
      Alert.alert('Sign in required', 'Sign in to report an activity.');
      return;
    }
    Alert.alert(
      'Report this activity?',
      'Choose this only if the activity appears unsafe, misleading, or inappropriate.',
      [
        { text: 'Keep activity', style: 'cancel' },
        {
          text: 'Report activity',
          style: 'destructive',
          onPress: () => {
            void reportActivity(activity.id, 'safety concern').then((result) => {
              setActionNotice(result.ok ? 'Thanks. Your report was submitted.' : result.message);
              if (!result.ok) setActionError(result.message);
            });
          },
        },
      ],
    );
  }

  function confirmRemove(participant: HostActivityParticipant) {
    Alert.alert(
      `Remove ${participant.participantDisplayName}?`,
      participant.membershipStatus === 'accepted'
        ? 'They will lose access to the private meeting point. The oldest waitlisted participant may be promoted.'
        : 'They will lose their place on the waitlist.',
      [
        { text: 'Keep participant', style: 'cancel' },
        { text: 'Remove participant', style: 'destructive', onPress: () => void performRemove(participant) },
      ],
    );
  }

  function confirmCancel() {
    Alert.alert(
      'Cancel this activity?',
      'Participants will be told it is cancelled and immediately lose access to the private meeting point.',
      [
        { text: 'Keep activity', style: 'cancel' },
        { text: 'Cancel activity', style: 'destructive', onPress: () => void performCancel() },
      ],
    );
  }

  async function openDirections() {
    const point = activity?.exactMeetingLocation;
    if (!point) return;
    const url = Platform.select({
      android: `geo:${point.latitude},${point.longitude}?q=${point.latitude},${point.longitude}`,
      default: `https://maps.apple.com/?daddr=${point.latitude},${point.longitude}&dirflg=w`,
    });
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Could not open Maps', 'Copy the meeting coordinates and try again.');
    }
  }

  if (!activity && state.status === 'loading') {
    return (
      <SafeAreaView style={styles.centerState}>
        <ActivityIndicator color="#FF6B4A" />
        <Text style={styles.centerBody}>Loading activity…</Text>
      </SafeAreaView>
    );
  }

  if (!activity) {
    return (
      <SafeAreaView style={styles.centerState}>
        <Ionicons color="#B63B2B" name="cloud-offline-outline" size={30} />
        <Text style={styles.centerTitle}>Activity unavailable</Text>
        <Text style={styles.centerBody}>{state.status === 'error' ? state.message : 'Try again.'}</Text>
        <Pressable accessibilityRole="button" onPress={() => void refresh()} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Try again</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.textButton}>
          <Text style={styles.textButtonText}>Go back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const exactPoint = activity.exactMeetingLocation;
  const distanceLabel = formatDistance(distanceM);

  return (
    <SafeAreaView edges={['top']} style={styles.screen}>
      <View style={styles.navRow}>
        <Pressable accessibilityLabel="Back" accessibilityRole="button" onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons color="#16202A" name="arrow-back" size={22} />
        </Pressable>
        <Text style={styles.navTitle}>Activity</Text>
        <View style={styles.iconButtonPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroMark}><Text style={styles.heroEmoji}>{KIND_EMOJIS[activity.kind]}</Text></View>
        <Text style={styles.eyebrow}>{activity.kind.toUpperCase()}</Text>
        <Text style={styles.title}>{activity.title}</Text>
        <Text style={styles.description}>{activity.description || 'A nearby activity hosted by the community.'}</Text>

        {membershipLabel && (
          <View style={[styles.membershipBanner, isInactive && styles.membershipBannerInactive]}>
            <Ionicons
              color={isInactive ? '#8A929A' : '#3E8E68'}
              name={isInactive ? 'alert-circle-outline' : 'checkmark-circle-outline'}
              size={19}
            />
            <Text style={[styles.membershipText, isInactive && styles.membershipTextInactive]}>{membershipLabel}</Text>
          </View>
        )}

        <View style={styles.infoCard}>
          <InfoRow icon="calendar-outline" text={formatFullTime(activity.startsAt, activity.endsAt)} />
          {distanceLabel && <InfoRow icon="walk-outline" text={distanceLabel} />}
          <InfoRow icon="person-outline" text={`Hosted by ${activity.hostDisplayName}`} />
          <InfoRow icon="people-outline" text={`${activity.participantCount}/${activity.capacity} going`} />
          <InfoRow
            icon={activity.joinMode === 'approval' ? 'shield-checkmark-outline' : 'flash-outline'}
            text={activity.joinMode === 'approval' ? 'Host approval required' : 'Open joining'}
          />
        </View>

        {isHost && !isInactive && participants.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>PARTICIPANTS</Text>
            <View style={styles.infoCard}>
              {participants.map((participant) => (
                <View key={participant.participantUserId} style={styles.participantRow}>
                  <View style={styles.participantCopy}>
                    <Text style={styles.participantName}>{participant.participantDisplayName}</Text>
                    <Text style={styles.participantStatus}>
                      {participant.membershipStatus === 'accepted' ? 'Going' : 'Waitlisted'}
                    </Text>
                  </View>
                  <Pressable
                    accessibilityLabel={`Remove ${participant.participantDisplayName}`}
                    accessibilityRole="button"
                    disabled={action !== null}
                    onPress={() => confirmRemove(participant)}
                    style={[styles.removeParticipantButton, action !== null && styles.disabledButton]}
                  >
                    <Text style={styles.removeParticipantText}>Remove</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </>
        )}

        <Text style={styles.sectionLabel}>LOCATION & PRIVACY</Text>
        <View style={styles.locationCard}>
          <View style={styles.locationIcon}>
            <Ionicons color="#FF6B4A" name="map-outline" size={23} />
          </View>
          <View style={styles.locationCopy}>
            <Text style={styles.locationTitle}>Approximate area</Text>
            <Text style={styles.locationBody}>
              The public map marker is deliberately shifted within about {activity.publicLocation.privacyRadiusM} m.
              It helps people understand the neighborhood without exposing the meeting point.
            </Text>
          </View>
        </View>

        <View style={[styles.locationCard, !exactPoint && styles.privateCardLocked]}>
          <View style={[styles.locationIcon, exactPoint && styles.privateIconUnlocked]}>
            <Ionicons color={exactPoint ? '#3E8E68' : '#8A929A'} name={exactPoint ? 'location' : 'lock-closed-outline'} size={23} />
          </View>
          <View style={styles.locationCopy}>
            <Text style={styles.locationTitle}>
              {exactPoint ? 'Private meeting point unlocked' : 'Exact meeting point stays private'}
            </Text>
            <Text style={styles.locationBody}>
              {exactPoint
                ? `${exactPoint.latitude.toFixed(5)}, ${exactPoint.longitude.toFixed(5)}`
                : isInactive
                  ? 'It is unavailable after an activity ends or is cancelled.'
                  : activity.membershipStatus === 'pending'
                    ? 'It appears after the host accepts your request.'
                    : activity.membershipStatus === 'waitlisted'
                      ? 'It appears if a place opens and you are accepted.'
                      : 'Only the host and accepted participants can see it.'}
            </Text>
            {exactPoint && (
              <Pressable accessibilityRole="button" onPress={() => void openDirections()} style={styles.mapsButton}>
                <Ionicons color="#FFFFFF" name="navigate-outline" size={17} />
                <Text style={styles.mapsButtonText}>Open walking directions</Text>
              </Pressable>
            )}
          </View>
        </View>

        {(actionError || actionNotice || state.status === 'error') && (
          <View style={[styles.feedback, (actionNotice && !actionError) && styles.feedbackSuccess]}>
            <Text style={(actionNotice && !actionError) ? styles.feedbackSuccessText : styles.feedbackErrorText}>
              {actionError ?? actionNotice ?? (state.status === 'error' ? state.message : null)}
            </Text>
          </View>
        )}

        {(activity.membershipStatus === 'rejected' || activity.membershipStatus === 'removed') && !isInactive && (
          <Text style={styles.unavailableCopy}>
            {activity.membershipStatus === 'rejected'
              ? 'The host declined this request. Joining is no longer available for this activity.'
              : 'The host removed this participation. Joining is no longer available for this activity.'}
          </Text>
        )}

        {(canJoin || canLeave) && (
          <Pressable
            accessibilityRole="button"
            disabled={action !== null}
            onPress={canLeave ? confirmLeave : beginJoin}
            style={[styles.primaryButton, canLeave && styles.leaveButton, action !== null && styles.disabledButton]}>
            {action === 'join' || action === 'leave' ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>{actionLabel(activity)}</Text>
            )}
          </Pressable>
        )}

        {isHost && !isInactive && (
          <Pressable
            accessibilityRole="button"
            disabled={action !== null}
            onPress={confirmCancel}
            style={[styles.cancelButton, action !== null && styles.disabledButton]}>
            {action === 'cancel' ? <ActivityIndicator color="#9D3E2B" /> : <Text style={styles.cancelButtonText}>Cancel activity</Text>}
          </Pressable>
        )}

        {!isHost && session && (
          <Pressable accessibilityRole="button" onPress={confirmReport} style={styles.reportButton}>
            <Text style={styles.reportButtonText}>Report activity</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons color="#66717D" name={icon} size={18} />
      <Text style={styles.infoText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#F7F4EE', flex: 1 },
  navRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 10 },
  navTitle: { color: '#16202A', fontSize: 15, fontWeight: '900' },
  iconButton: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: 'rgba(22,32,42,0.1)', borderRadius: 22, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 },
  iconButtonPlaceholder: { height: 44, width: 44 },
  content: { paddingBottom: 42, paddingHorizontal: 22 },
  heroMark: { alignItems: 'center', backgroundColor: '#FBE4DF', borderRadius: 31, height: 62, justifyContent: 'center', marginTop: 20, width: 62 },
  heroEmoji: { fontSize: 29 },
  eyebrow: { color: '#FF6B4A', fontSize: 10, fontWeight: '900', letterSpacing: 1.4, marginTop: 25 },
  title: { color: '#16202A', fontSize: 38, fontWeight: '900', letterSpacing: -1.5, lineHeight: 42, marginTop: 7 },
  description: { color: '#5F6B76', fontSize: 15, lineHeight: 23, marginTop: 12 },
  membershipBanner: { alignItems: 'center', backgroundColor: '#E1F2E9', borderRadius: 14, flexDirection: 'row', gap: 9, marginTop: 22, padding: 14 },
  membershipBannerInactive: { backgroundColor: '#E9E7E2' },
  membershipText: { color: '#2E7554', flex: 1, fontSize: 13, fontWeight: '800' },
  membershipTextInactive: { color: '#747C84' },
  infoCard: { backgroundColor: '#FFFFFF', borderColor: 'rgba(22,32,42,0.08)', borderRadius: 20, borderWidth: 1, gap: 15, marginTop: 18, padding: 18 },
  infoRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 12 },
  infoText: { color: '#394652', flex: 1, fontSize: 13, lineHeight: 19 },
  sectionLabel: { color: '#66717D', fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginTop: 28 },
  locationCard: { alignItems: 'flex-start', backgroundColor: '#FFFFFF', borderColor: 'rgba(22,32,42,0.08)', borderRadius: 20, borderWidth: 1, flexDirection: 'row', gap: 14, marginTop: 10, padding: 17 },
  privateCardLocked: { backgroundColor: '#EFEEE9' },
  locationIcon: { alignItems: 'center', backgroundColor: '#FBE4DF', borderRadius: 21, height: 42, justifyContent: 'center', width: 42 },
  privateIconUnlocked: { backgroundColor: '#E1F2E9' },
  locationCopy: { flex: 1 },
  locationTitle: { color: '#16202A', fontSize: 14, fontWeight: '900' },
  locationBody: { color: '#66717D', fontSize: 12, lineHeight: 18, marginTop: 5 },
  mapsButton: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#3E8E68', borderRadius: 999, flexDirection: 'row', gap: 7, marginTop: 14, paddingHorizontal: 15, paddingVertical: 10 },
  mapsButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  participantRow: { alignItems: 'center', borderBottomColor: 'rgba(22,32,42,0.08)', borderBottomWidth: 1, flexDirection: 'row', gap: 12, paddingVertical: 9 },
  participantCopy: { flex: 1 },
  participantName: { color: '#16202A', fontSize: 14, fontWeight: '800' },
  participantStatus: { color: '#66717D', fontSize: 12, marginTop: 3 },
  removeParticipantButton: { borderColor: 'rgba(157,62,43,0.25)', borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  removeParticipantText: { color: '#9D3E2B', fontSize: 11, fontWeight: '900' },
  feedback: { backgroundColor: '#FBE4DF', borderRadius: 14, marginTop: 18, padding: 13 },
  feedbackSuccess: { backgroundColor: '#E1F2E9' },
  feedbackErrorText: { color: '#9D3E2B', fontSize: 12, fontWeight: '700', lineHeight: 18 },
  feedbackSuccessText: { color: '#2E7554', fontSize: 12, fontWeight: '700', lineHeight: 18 },
  unavailableCopy: { color: '#66717D', fontSize: 13, lineHeight: 20, marginTop: 18, textAlign: 'center' },
  primaryButton: { alignItems: 'center', backgroundColor: '#16202A', borderRadius: 999, justifyContent: 'center', marginTop: 24, minHeight: 54, paddingHorizontal: 20 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  leaveButton: { backgroundColor: '#9D3E2B' },
  cancelButton: { alignItems: 'center', borderColor: 'rgba(157,62,43,0.25)', borderRadius: 999, borderWidth: 1, justifyContent: 'center', marginTop: 12, minHeight: 52, paddingHorizontal: 20 },
  cancelButtonText: { color: '#9D3E2B', fontSize: 14, fontWeight: '900' },
  reportButton: { alignItems: 'center', marginTop: 18, padding: 10 },
  reportButtonText: { color: '#66717D', fontSize: 12, fontWeight: '800' },
  disabledButton: { opacity: 0.5 },
  centerState: { alignItems: 'center', backgroundColor: '#F7F4EE', flex: 1, justifyContent: 'center', paddingHorizontal: 30 },
  centerTitle: { color: '#16202A', fontSize: 25, fontWeight: '900', letterSpacing: -0.8, marginTop: 16, textAlign: 'center' },
  centerBody: { color: '#66717D', fontSize: 14, lineHeight: 21, marginTop: 10, textAlign: 'center' },
  textButton: { marginTop: 17, padding: 10 },
  textButtonText: { color: '#66717D', fontSize: 13, fontWeight: '800' },
});
