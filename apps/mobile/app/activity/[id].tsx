import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { radii } from '@/constants/design-tokens';
import { HostAvatar } from '@/components/host-avatar';
import { avatarChoice, avatarSeed } from '@/lib/avatar-identity';
import { useActivityDetail } from '@/hooks/use-activity-detail';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { appendActivityMessage } from '@/lib/activity-message-utils';
import { resolveChatConnectionTransition, type ChatSubscriptionStatus } from '@/lib/chat-connection';
import { blockActivityHost, cancelActivity, getActivityMessages, getHostActivityParticipants, joinActivity, leaveActivity, removeActivityParticipant, reportActivity, sendActivityMessage } from '@/lib/activity-repository';
import { walkingDirectionsUrl } from '@/lib/directions';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/auth-provider';
import { useProfile } from '@/providers/profile-provider';
import { useTheme } from '@/providers/theme-provider';
import type { ActivityDetail, ActivityKind, ActivityMessage, HostActivityParticipant } from '@/types/activity';

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
  const { colors } = useTheme();
  const styles = makeStyles(colors);
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
  const [messages, setMessages] = useState<ActivityMessage[]>([]);
  const [messageDraft, setMessageDraft] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const [chatConnection, setChatConnection] = useState<'idle' | 'live' | 'polling'>('idle');
  const reducedMotion = useReducedMotion();
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
  const canChat = Boolean(activity && !isInactive && (isHost || activity.membershipStatus === 'accepted'));
  const refreshParticipants = useCallback(async () => {
    if (!activityId || !isHost) return;
    const result = await getHostActivityParticipants(activityId);
    if (result.ok) setParticipants(result.participants);
  }, [activityId, isHost]);

  useFocusEffect(useCallback(() => { void refreshParticipants(); }, [refreshParticipants]));
  const refreshMessages = useCallback(async () => {
    if (!activityId || !canChat) return;
    const result = await getActivityMessages(activityId);
    if (result.ok) setMessages(result.messages);
  }, [activityId, canChat]);

  useFocusEffect(useCallback(() => { void refreshMessages(); }, [refreshMessages]));

  useEffect(() => {
    if (!activityId || !canChat) {
      setChatConnection('idle');
      return undefined;
    }

    let pollingTimer: ReturnType<typeof setInterval> | undefined;
    const applyChatConnection = (status: ChatSubscriptionStatus) => {
      const transition = resolveChatConnectionTransition(status, pollingTimer !== undefined);
      setChatConnection(transition.connection);

      if (transition.stopPolling && pollingTimer !== undefined) {
        clearInterval(pollingTimer);
        pollingTimer = undefined;
      }
      if (transition.startPolling) {
        pollingTimer = setInterval(() => { void refreshMessages(); }, 15_000);
      }
    };
    const channel = supabase?.channel(`activity-chat:${activityId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'private',
        table: 'activity_messages',
        filter: `activity_id=eq.${activityId}`,
      }, () => { void refreshMessages(); })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          applyChatConnection('SUBSCRIBED');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          applyChatConnection(status);
        }
      });

    if (!channel) {
      applyChatConnection('unavailable');
    }

    return () => {
      if (pollingTimer !== undefined) clearInterval(pollingTimer);
      pollingTimer = undefined;
      if (channel) void channel.unsubscribe();
    };
  }, [activityId, canChat, refreshMessages]);
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

  async function submitMessage() {
    const body = messageDraft.trim();
    if (!activity || !body || chatSending) return;
    setChatSending(true);
    setActionError(null);
    const result = await sendActivityMessage(activity.id, body);
    setChatSending(false);
    if (!result.ok) {
      setActionError(result.message);
      return;
    }
    setMessageDraft('');
    setMessages((current) => appendActivityMessage(current, result.message));
  }

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

  function confirmBlockHost() {
    if (!activity || !session || isHost) return;
    Alert.alert(
      'Block this host?',
      'You will no longer see this host’s activities or private coordination. Your existing membership will remain until you leave or the host removes you.',
      [
        { text: 'Keep host', style: 'cancel' },
        {
          text: 'Block host',
          style: 'destructive',
          onPress: () => {
            // Invalidate the private point before the network round trip so a
            // stale detail response cannot leave it visible after blocking.
            redactExactLocation();
            void blockActivityHost(activity.id).then(async (result) => {
              if (!result.ok) { setActionError(result.message); return; }
              setActionNotice('Host blocked. Private location and coordination access were refreshed.');
              if (reducedMotion) setActionNotice('Host blocked. Reduced Motion is enabled; access refreshed without animation.');
              await refresh();
              await refreshMessages();
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
    try {
      await Linking.openURL(walkingDirectionsUrl(point, Platform.OS === 'android' ? 'android' : 'ios'));
    } catch {
      Alert.alert('Could not open Maps', 'Copy the meeting coordinates and try again.');
    }
  }

  if (!activity && state.status === 'loading') {
    return (
      <SafeAreaView style={styles.centerState}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.centerBody}>Loading activity…</Text>
      </SafeAreaView>
    );
  }

  if (!activity) {
    return (
      <SafeAreaView style={styles.centerState}>
        <Ionicons color={colors.danger} name="cloud-offline-outline" size={30} />
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
          <Ionicons color={colors.text} name="arrow-back" size={22} />
        </Pressable>
        <Text style={styles.navTitle}>Activity</Text>
        <View style={styles.iconButtonPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroRow}>
          <View style={styles.heroMark}>
            <HostAvatar
              seed={avatarSeed(activity.hostAvatarConfig, activity.hostDisplayName)}
              avatarId={avatarChoice(activity.hostAvatarConfig, activity.hostDisplayName)}
              size={82}
            />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>{KIND_EMOJIS[activity.kind]}  {activity.kind.toUpperCase()}</Text>
            <Text style={styles.hostName}>{activity.hostDisplayName}</Text>
            <Text style={styles.hostCaption}>NearHere host</Text>
          </View>
        </View>
        <Text style={styles.title}>{activity.title}</Text>
        <Text style={styles.description}>{activity.description || 'A nearby activity hosted by the community.'}</Text>

        {membershipLabel && (
          <View style={[styles.membershipBanner, isInactive && styles.membershipBannerInactive]}>
            <Ionicons
              color={isInactive ? colors.subtleText : colors.success}
              name={isInactive ? 'alert-circle-outline' : 'checkmark-circle-outline'}
              size={19}
            />
            <Text style={[styles.membershipText, isInactive && styles.membershipTextInactive]}>{membershipLabel}</Text>
          </View>
        )}

        <View style={styles.infoCard}>
          <InfoRow icon="calendar-outline" text={formatFullTime(activity.startsAt, activity.endsAt)} />
          {distanceLabel && <InfoRow icon="walk-outline" text={distanceLabel} />}
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

        {canChat && (
          <>
            <Text style={styles.sectionLabel}>ACTIVITY CHAT</Text>
            <View style={styles.chatCard}>
              {messages.length === 0 ? (
                <Text style={styles.chatEmpty}>No messages yet. Start the coordination.</Text>
              ) : messages.map((message) => (
                <View key={message.id} style={styles.messageBubble}>
                  <View style={styles.messageHeader}>
                    <Text style={styles.messageAuthor}>{message.authorDisplayName}</Text>
                    <Text style={styles.messageTime}>{new Date(message.createdAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</Text>
                  </View>
                  <Text style={styles.messageBody}>{message.body}</Text>
                </View>
              ))}
              {chatConnection === 'polling' && (
                <Text style={styles.chatStatus}>Live updates are reconnecting; checking for new messages automatically.</Text>
              )}
              <View style={styles.chatInputRow}>
                <TextInput
                  accessibilityLabel="Activity message"
                  editable={!chatSending}
                  maxLength={1000}
                  multiline
                  onChangeText={setMessageDraft}
                  placeholder="Write to the activity…"
                  placeholderTextColor={colors.subtleText}
                  style={styles.chatInput}
                  value={messageDraft}
                />
                <Pressable
                  accessibilityLabel="Send message"
                  accessibilityRole="button"
                  disabled={chatSending || !messageDraft.trim()}
                  onPress={() => void submitMessage()}
                  style={[styles.sendButton, (chatSending || !messageDraft.trim()) && styles.disabledButton]}
                >
                  {chatSending ? <ActivityIndicator color={colors.onAccent} size="small" /> : <Ionicons color={colors.onAccent} name="arrow-up" size={18} />}
                </Pressable>
              </View>
            </View>
          </>
        )}

        <Text style={styles.sectionLabel}>LOCATION & PRIVACY</Text>
        <View style={styles.locationCard}>
          <View style={styles.locationIcon}>
            <Ionicons color={colors.accent} name="map-outline" size={23} />
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
            <Ionicons color={exactPoint ? colors.success : colors.subtleText} name={exactPoint ? 'location' : 'lock-closed-outline'} size={23} />
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
                <Ionicons color={colors.onAccent} name="navigate-outline" size={17} />
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
              <ActivityIndicator color={colors.onAccent} />
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
            {action === 'cancel' ? <ActivityIndicator color={colors.danger} /> : <Text style={styles.cancelButtonText}>Cancel activity</Text>}
          </Pressable>
        )}

        {!isHost && session && (
          <View style={styles.safetyActions}>
            <Pressable accessibilityRole="button" onPress={confirmReport} style={styles.reportButton}>
              <Text style={styles.reportButtonText}>Report activity</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={confirmBlockHost} style={styles.reportButton}>
              <Text style={styles.reportButtonText}>Block host</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={styles.infoRow}>
      <Ionicons color={colors.mutedText} name={icon} size={18} />
      <Text style={styles.infoText}>{text}</Text>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
  screen: { backgroundColor: colors.canvas, flex: 1 },
  navRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 10 },
  navTitle: { color: colors.text, fontSize: 15, fontWeight: '900' },
  iconButton: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 22, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 },
  iconButtonPlaceholder: { height: 44, width: 44 },
  content: { paddingBottom: 42, paddingHorizontal: 22 },
  heroRow: { alignItems: 'center', flexDirection: 'row', gap: 16, marginTop: 24 },
  heroMark: { alignItems: 'center', backgroundColor: colors.raised, borderRadius: 42, height: 82, justifyContent: 'center', overflow: 'hidden', width: 82 },
  heroCopy: { flex: 1 },
  hostName: { color: colors.text, fontSize: 18, fontWeight: '900', marginTop: 7 },
  hostCaption: { color: colors.mutedText, fontSize: 12, marginTop: 3 },
  heroEmoji: { fontSize: 29 },
  eyebrow: { color: colors.accent, fontSize: 10, fontWeight: '900', letterSpacing: 1.4, marginTop: 25 },
  title: { color: colors.text, fontSize: 38, fontWeight: '900', letterSpacing: -1.5, lineHeight: 42, marginTop: 7 },
  description: { color: colors.mutedText, fontSize: 15, lineHeight: 23, marginTop: 12 },
  membershipBanner: { alignItems: 'center', backgroundColor: colors.raised, borderRadius: 14, flexDirection: 'row', gap: 9, marginTop: 22, padding: 14 },
  membershipBannerInactive: { backgroundColor: colors.surface },
  membershipText: { color: colors.success, flex: 1, fontSize: 13, fontWeight: '800' },
  membershipTextInactive: { color: colors.mutedText },
  infoCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.surface, borderWidth: 1, gap: 15, marginTop: 18, padding: 18 },
  infoRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 12 },
  infoText: { color: colors.text, flex: 1, fontSize: 13, lineHeight: 19 },
  sectionLabel: { color: colors.mutedText, fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginTop: 28 },
  locationCard: { alignItems: 'flex-start', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.surface, borderWidth: 1, flexDirection: 'row', gap: 14, marginTop: 10, padding: 17 },
  privateCardLocked: { backgroundColor: colors.raised },
  locationIcon: { alignItems: 'center', backgroundColor: colors.raised, borderRadius: 21, height: 42, justifyContent: 'center', width: 42 },
  privateIconUnlocked: { backgroundColor: colors.surface },
  locationCopy: { flex: 1 },
  locationTitle: { color: colors.text, fontSize: 14, fontWeight: '900' },
  locationBody: { color: colors.mutedText, fontSize: 12, lineHeight: 18, marginTop: 5 },
  mapsButton: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: colors.accent, borderRadius: radii.pill, flexDirection: 'row', gap: 7, marginTop: 14, paddingHorizontal: 15, paddingVertical: 10 },
  mapsButtonText: { color: colors.onAccent, fontSize: 12, fontWeight: '900' },
  participantRow: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', gap: 12, paddingVertical: 9 },
  participantCopy: { flex: 1 },
  participantName: { color: colors.text, fontSize: 14, fontWeight: '800' },
  participantStatus: { color: colors.mutedText, fontSize: 12, marginTop: 3 },
  chatCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.surface, borderWidth: 1, gap: 10, marginTop: 10, padding: 14 },
  chatEmpty: { color: colors.mutedText, fontSize: 13, lineHeight: 19, paddingVertical: 6 },
  chatStatus: { color: colors.subtleText, fontSize: 11, lineHeight: 16, paddingTop: 2 },
  messageBubble: { backgroundColor: colors.raised, borderRadius: 14, padding: 11 },
  messageHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  messageAuthor: { color: colors.text, fontSize: 12, fontWeight: '900' },
  messageTime: { color: colors.subtleText, fontSize: 10 },
  messageBody: { color: colors.text, fontSize: 13, lineHeight: 19, marginTop: 4 },
  chatInputRow: { alignItems: 'flex-end', flexDirection: 'row', gap: 8, marginTop: 4 },
  chatInput: { backgroundColor: colors.raised, borderColor: colors.border, borderRadius: 14, borderWidth: 1, color: colors.text, flex: 1, fontSize: 13, maxHeight: 90, minHeight: 44, paddingHorizontal: 12, paddingVertical: 11 },
  sendButton: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: 22, height: 44, justifyContent: 'center', width: 44 },
  removeParticipantButton: { borderColor: colors.danger, borderRadius: radii.pill, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  removeParticipantText: { color: colors.danger, fontSize: 11, fontWeight: '900' },
  feedback: { backgroundColor: colors.warningSurface, borderRadius: 14, marginTop: 18, padding: 13 },
  feedbackSuccess: { backgroundColor: colors.raised },
  feedbackErrorText: { color: colors.danger, fontSize: 12, fontWeight: '700', lineHeight: 18 },
  feedbackSuccessText: { color: colors.success, fontSize: 12, fontWeight: '700', lineHeight: 18 },
  unavailableCopy: { color: colors.mutedText, fontSize: 13, lineHeight: 20, marginTop: 18, textAlign: 'center' },
  primaryButton: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: radii.pill, justifyContent: 'center', marginTop: 24, minHeight: 54, paddingHorizontal: 20 },
  primaryButtonText: { color: colors.onAccent, fontSize: 14, fontWeight: '900' },
  leaveButton: { backgroundColor: colors.danger },
  cancelButton: { alignItems: 'center', borderColor: colors.danger, borderRadius: radii.pill, borderWidth: 1, justifyContent: 'center', marginTop: 12, minHeight: 52, paddingHorizontal: 20 },
  cancelButtonText: { color: colors.danger, fontSize: 14, fontWeight: '900' },
  reportButton: { alignItems: 'center', marginTop: 18, padding: 10 },
  reportButtonText: { color: colors.mutedText, fontSize: 12, fontWeight: '800' },
  safetyActions: { alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginTop: 12 },
  disabledButton: { opacity: 0.5 },
  centerState: { alignItems: 'center', backgroundColor: colors.canvas, flex: 1, justifyContent: 'center', paddingHorizontal: 30 },
  centerTitle: { color: colors.text, fontSize: 25, fontWeight: '900', letterSpacing: -0.8, marginTop: 16, textAlign: 'center' },
  centerBody: { color: colors.mutedText, fontSize: 14, lineHeight: 21, marginTop: 10, textAlign: 'center' },
  textButton: { marginTop: 17, padding: 10 },
  textButtonText: { color: colors.mutedText, fontSize: 13, fontWeight: '800' },
  });
}
