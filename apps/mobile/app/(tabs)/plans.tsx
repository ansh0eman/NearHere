import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
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

import { useMyPlans } from '@/hooks/use-my-plans';
import { useMembershipRequests } from '@/hooks/use-membership-requests';
import { HostAvatar } from '@/components/host-avatar';
import { avatarChoice, avatarSeed } from '@/lib/avatar-identity';
import { radii, spacing, typeScale } from '@/constants/design-tokens';
import { isInactivePlan, partitionPlans } from '@/lib/plan-utils';
import { walkingDirectionsUrl } from '@/lib/directions';
import { useAuth } from '@/providers/auth-provider';
import type { HostedMembershipRequest, MyPlanSummary } from '@/types/activity';
import { useTheme } from '@/providers/theme-provider';

const STATUS_LABELS: Record<MyPlanSummary['membershipStatus'], string> = {
  accepted: 'Going',
  pending: 'Requested',
  waitlisted: 'Waitlisted',
};

function formatPlanTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  });
}

export default function PlansScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { session, setPendingIntent } = useAuth();
  const userId = session?.user.id ?? null;
  const { actionError, actionNotice, leave, leavingActivityId, refresh, state } = useMyPlans(userId);
  const {
    actionError: requestActionError,
    actionNotice: requestActionNotice,
    decide,
    decidingKey,
    refresh: refreshRequests,
    state: requestState,
  } = useMembershipRequests(userId, state.plans);
  const { history, upcoming } = partitionPlans(state.plans);

  useFocusEffect(
    useCallback(() => {
      if (session) void refresh();
      if (session) void refreshRequests();
    }, [refresh, refreshRequests, session]),
  );

  function confirmLeave(plan: MyPlanSummary) {
    const membershipName = plan.membershipStatus === 'pending'
      ? 'join request'
      : plan.membershipStatus === 'waitlisted' ? 'waitlist place' : 'activity';
    Alert.alert(
      `Leave ${membershipName}?`,
      plan.membershipStatus === 'accepted'
        ? 'You will immediately lose access to the private meeting point. You can try to join again later if the activity is still available.'
        : plan.membershipStatus === 'pending'
          ? 'This withdraws your request. You can request to join again later.'
          : 'This gives up your waitlist place. You can try to join again later.',
      [
        { text: 'Keep plan', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: () => { void leave(plan.id); },
        },
      ],
    );
  }

  function beginSignIn() {
    setPendingIntent({ kind: 'openPlans' });
    router.push('/auth/phone');
  }

  async function handleDecision(
    activityId: string,
    requesterUserId: string,
    decision: 'approve' | 'reject',
  ) {
    const changed = await decide(activityId, requesterUserId, decision);
    if (changed) void refresh();
    return changed;
  }

  async function openDirections(plan: MyPlanSummary) {
    if (!plan.exactMeetingLocation) return;

    try {
      await Linking.openURL(
        walkingDirectionsUrl(
          plan.exactMeetingLocation,
          Platform.OS === 'android' ? 'android' : 'ios',
        ),
      );
    } catch {
      Alert.alert('Could not open Maps', 'Open Activity Details to view the meeting point instead.');
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>YOUR ACTIVITIES</Text>
          <Text style={styles.title}>Plans</Text>
          <Text style={styles.subtitle}>Everything you host, join, request, or waitlist for.</Text>
        </View>

        {state.status === 'signedOut' ? (
          <EmptyState
            body="Browse freely, then sign in only when you want to join or host an activity."
            buttonLabel="Sign in to see plans"
            icon="person-outline"
            onPress={beginSignIn}
            title="Your plans follow your account"
          />
        ) : state.status === 'loading' && state.plans.length === 0 ? (
          <View style={styles.centerState}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.stateBody}>Loading your plans…</Text>
          </View>
        ) : state.status === 'error' && state.plans.length === 0 ? (
          <EmptyState
            body={state.message}
            buttonLabel="Try again"
            icon="cloud-offline-outline"
            onPress={() => void refresh()}
            title="Plans could not load"
          />
        ) : state.plans.length === 0 ? (
          <EmptyState
            body="Join an activity from the map, or create one when inspiration strikes."
            buttonLabel="Explore nearby"
            icon="calendar-outline"
            onPress={() => router.push('/')}
            title="Your next plan starts nearby"
          />
        ) : (
          <View style={styles.list}>
            {(leavingActivityId || actionError || actionNotice) && (
              <View style={[
                styles.errorBanner,
                (leavingActivityId || actionNotice) && styles.progressBanner,
              ]}>
                {leavingActivityId && <ActivityIndicator color={colors.success} size="small" />}
                <Text style={leavingActivityId || actionNotice ? styles.progressBannerText : styles.errorBannerText}>
                  {leavingActivityId
                    ? 'Leaving activity and removing private access…'
                    : actionError ?? actionNotice}
                </Text>
              </View>
            )}
            <RequestsSection
              actionError={requestActionError}
              actionNotice={requestActionNotice}
              decidingKey={decidingKey}
              onDecide={handleDecision}
              onRetry={() => void refreshRequests()}
              state={requestState}
            />
            {state.status === 'loading' && (
              <View style={styles.refreshRow}>
                <ActivityIndicator color={colors.accent} size="small" />
                <Text style={styles.refreshText}>Refreshing plans…</Text>
              </View>
            )}
            {state.status === 'error' && (
              <Pressable accessibilityRole="button" onPress={() => void refresh()} style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{state.message} Tap to retry.</Text>
              </Pressable>
            )}
            {upcoming.length > 0 && <Text style={styles.listSectionTitle}>Upcoming</Text>}
            {upcoming.map((plan) => (
              <PlanCard key={plan.id} onDirections={() => void openDirections(plan)} onLeave={() => confirmLeave(plan)} onOpen={() => router.push({ pathname: '/activity/[id]', params: { id: plan.id } })} plan={plan} />
            ))}
            {history.length > 0 && <Text style={styles.listSectionTitle}>Past activity</Text>}
            {history.map((plan) => (
              <PlanCard key={plan.id} onDirections={() => void openDirections(plan)} onLeave={() => confirmLeave(plan)} onOpen={() => router.push({ pathname: '/activity/[id]', params: { id: plan.id } })} plan={plan} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function PlanCard({
  onDirections,
  onLeave,
  onOpen,
  plan,
}: {
  onDirections: () => void;
  onLeave: () => void;
  onOpen: () => void;
  plan: MyPlanSummary;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const isHost = plan.membershipRole === 'host';
  const meetingPoint = plan.exactMeetingLocation;
  const isInactive = isInactivePlan(plan);
  const membershipLabel = isInactive
    ? plan.status === 'cancelled' ? 'Cancelled' : 'Ended'
    : isHost ? 'Hosting' : STATUS_LABELS[plan.membershipStatus];

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityHint="Opens full activity details"
        accessibilityLabel={`View ${plan.title}`}
        accessibilityRole="button"
        onPress={onOpen}
        style={({ pressed }) => pressed && styles.buttonPressed}>
        <View style={styles.cardTopRow}>
          <Text style={styles.kind}>{plan.kind.toUpperCase()}</Text>
          <View
            style={[
              styles.statusPill,
              (isInactive || plan.membershipStatus !== 'accepted') && styles.statusPillMuted,
            ]}>
            <Text style={styles.statusText}>{membershipLabel}</Text>
          </View>
        </View>
        <Text style={styles.cardTitle}>{plan.title}</Text>
        <View style={styles.detailRow}>
          <Ionicons color={colors.mutedText} name="time-outline" size={16} />
          <Text style={styles.detailText}>{formatPlanTime(plan.startsAt)}</Text>
        </View>
        <View style={styles.hostRow}>
          <View style={styles.hostAvatar}>
            <HostAvatar seed={avatarSeed(plan.hostAvatarConfig, plan.hostDisplayName)} avatarId={avatarChoice(plan.hostAvatarConfig, plan.hostDisplayName)} size={38} />
          </View>
          <View style={styles.hostCopy}>
            <Text style={styles.hostName}>{plan.hostDisplayName}</Text>
            <Text style={styles.detailText}>
              {plan.participantCount}/{plan.capacity} {isInactive ? 'participants' : 'going'}
            </Text>
          </View>
        </View>

        <View style={[styles.locationBox, !meetingPoint && styles.locationBoxLocked]}>
          <Ionicons
            color={meetingPoint ? colors.success : colors.subtleText}
            name={meetingPoint ? 'location' : 'lock-closed-outline'}
            size={18}
          />
          <View style={styles.locationCopy}>
            <Text style={styles.locationTitle}>
              {meetingPoint
                ? 'Private meeting point unlocked'
                : isInactive ? 'Meeting point no longer available' : 'Exact meeting point stays private'}
            </Text>
            <Text style={styles.locationText}>
              {meetingPoint
                ? `${meetingPoint.latitude.toFixed(4)}, ${meetingPoint.longitude.toFixed(4)}`
                : isInactive
                  ? 'NearHere removes exact-location access after an activity ends or is cancelled.'
                : plan.membershipStatus === 'pending'
                  ? 'It appears after the host accepts your request.'
                  : 'It appears if a place opens and you are accepted.'}
            </Text>
          </View>
        </View>
      </Pressable>
      {meetingPoint && !isInactive && (
        <Pressable
          accessibilityLabel={`Open walking directions for ${plan.title}`}
          accessibilityRole="button"
          onPress={onDirections}
          style={({ pressed }) => [styles.directionsButton, pressed && styles.buttonPressed]}>
          <Ionicons color={colors.accent} name="navigate-outline" size={17} />
          <Text style={styles.directionsButtonText}>Walking directions</Text>
        </Pressable>
      )}
      {!isHost && !isInactive && (
        <Pressable
          accessibilityLabel={`Leave ${plan.title}`}
          accessibilityRole="button"
          onPress={onLeave}
          style={({ pressed }) => [styles.leaveButton, pressed && styles.buttonPressed]}>
          <Ionicons color={colors.danger} name="exit-outline" size={17} />
          <Text style={styles.leaveButtonText}>
            {plan.membershipStatus === 'pending'
              ? 'Withdraw request'
              : plan.membershipStatus === 'waitlisted' ? 'Leave waitlist' : 'Leave activity'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

function RequestsSection({
  actionError,
  actionNotice,
  decidingKey,
  onDecide,
  onRetry,
  state,
}: {
  actionError: string | null;
  actionNotice: string | null;
  decidingKey: string | null;
  onDecide: (
    activityId: string,
    requesterUserId: string,
    decision: 'approve' | 'reject',
  ) => Promise<boolean>;
  onRetry: () => void;
  state: ReturnType<typeof useMembershipRequests>['state'];
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  if (state.status === 'signedOut' || (state.status === 'ready' && state.requests.length === 0)) {
    return null;
  }
  if (state.status === 'loading' && state.requests.length === 0) {
    return (
      <View style={styles.requestsLoading}>
        <ActivityIndicator color={colors.accent} size="small" />
        <Text style={styles.refreshText}>Checking join requests…</Text>
      </View>
    );
  }
  if (state.status === 'error' && state.requests.length === 0) {
    return (
      <Pressable accessibilityRole="button" onPress={onRetry} style={styles.errorBanner}>
        <Text style={styles.errorBannerText}>{state.message} Tap to retry.</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.requestsSection}>
      <View style={styles.sectionHeadingRow}>
        <View>
          <Text style={styles.sectionEyebrow}>HOST TOOLS</Text>
          <Text style={styles.sectionTitle}>Join requests</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{state.requests.length}</Text>
        </View>
      </View>
      {actionError && <Text style={styles.inlineError}>{actionError}</Text>}
      {actionNotice && <Text style={styles.inlineNotice}>{actionNotice}</Text>}
      {state.requests.map((request) => {
        const key = `${request.activityId}:${request.requesterUserId}`;
        return (
          <RequestCard
            disabled={decidingKey !== null}
            isDeciding={decidingKey === key}
            key={key}
            onDecide={(decision) => onDecide(
              request.activityId,
              request.requesterUserId,
              decision,
            )}
            request={request}
          />
        );
      })}
    </View>
  );
}

function RequestCard({
  disabled,
  isDeciding,
  onDecide,
  request,
}: {
  disabled: boolean;
  isDeciding: boolean;
  onDecide: (decision: 'approve' | 'reject') => Promise<boolean>;
  request: HostedMembershipRequest;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={styles.requestCard}>
      <View style={styles.requestAvatar}>
        <HostAvatar seed={avatarSeed(null, request.requesterUserId)} size={40} />
      </View>
      <View style={styles.requestContent}>
        <Text style={styles.requestName}>{request.requesterDisplayName}</Text>
        <Text style={styles.requestActivity} numberOfLines={1}>{request.activityTitle}</Text>
        <Text style={styles.requestMeta}>
          {request.participantCount}/{request.capacity} going · {formatPlanTime(request.activityStartsAt)}
        </Text>
        <View style={styles.requestActions}>
          <Pressable
            accessibilityLabel={`Reject ${request.requesterDisplayName}`}
            accessibilityRole="button"
            disabled={disabled}
            onPress={() => void onDecide('reject')}
            style={({ pressed }) => [styles.rejectButton, pressed && styles.buttonPressed]}>
            <Text style={styles.rejectButtonText}>Decline</Text>
          </Pressable>
          <Pressable
            accessibilityLabel={`Accept ${request.requesterDisplayName}`}
            accessibilityRole="button"
            disabled={disabled}
            onPress={() => void onDecide('approve')}
            style={({ pressed }) => [styles.acceptButton, pressed && styles.buttonPressed]}>
            {isDeciding ? <ActivityIndicator color={colors.onAccent} size="small" /> : (
              <Text style={styles.acceptButtonText}>Accept</Text>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function EmptyState({
  body,
  buttonLabel,
  icon,
  onPress,
  title,
}: {
  body: string;
  buttonLabel: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  title: string;
}) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return (
    <View style={styles.centerState}>
      <View style={styles.emptyIcon}>
        <Ionicons color={colors.accent} name={icon} size={29} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.stateBody}>{body}</Text>
      <Pressable accessibilityRole="button" onPress={onPress} style={styles.button}>
        <Text style={styles.buttonText}>{buttonLabel}</Text>
      </Pressable>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
  screen: { backgroundColor: colors.canvas, flex: 1 },
  content: { flexGrow: 1, paddingBottom: 110, paddingHorizontal: spacing.lg },
  header: { paddingTop: spacing.xl },
  eyebrow: { color: colors.accent, fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  title: { color: colors.text, fontSize: 38, fontWeight: '800', letterSpacing: -1.3, marginTop: spacing.xs },
  subtitle: { ...typeScale.secondary, color: colors.mutedText, marginTop: spacing.xs },
  centerState: { alignItems: 'center', flex: 1, justifyContent: 'center', minHeight: 430, paddingHorizontal: spacing.lg },
  emptyIcon: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.surface, borderWidth: 1, height: 60, justifyContent: 'center', width: 60 },
  emptyTitle: { ...typeScale.section, color: colors.text, marginTop: spacing.xl, textAlign: 'center' },
  stateBody: { ...typeScale.secondary, color: colors.mutedText, marginTop: spacing.sm, maxWidth: 300, textAlign: 'center' },
  button: { backgroundColor: colors.accent, borderRadius: radii.pill, marginTop: spacing.xl, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  buttonText: { color: colors.onAccent, fontSize: 13, fontWeight: '800' },
  list: { gap: spacing.md, marginTop: spacing.xl },
  listSectionTitle: { color: colors.mutedText, fontSize: 11, fontWeight: '800', letterSpacing: 0.8, marginTop: spacing.sm },
  refreshRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, justifyContent: 'center' },
  refreshText: { color: colors.mutedText, fontSize: 12, fontWeight: '700' },
  errorBanner: { backgroundColor: colors.dangerSurface, borderColor: colors.danger, borderRadius: radii.control, borderWidth: 1, padding: spacing.md },
  errorBannerText: { color: colors.danger, fontSize: 12, fontWeight: '700', lineHeight: 17 },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.surface, borderWidth: 1, padding: spacing.lg },
  cardTopRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  kind: { color: colors.accent, fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  statusPill: { backgroundColor: colors.successSurface, borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 6 },
  statusPillMuted: { backgroundColor: colors.raised },
  statusText: { color: colors.text, fontSize: 10, fontWeight: '800' },
  cardTitle: { color: colors.text, fontSize: 20, fontWeight: '800', letterSpacing: -0.4, marginBottom: spacing.md, marginTop: spacing.md },
  detailRow: { alignItems: 'center', flexDirection: 'row', gap: 7, marginTop: 7 },
  detailText: { color: colors.mutedText, flex: 1, fontSize: 12, lineHeight: 17 },
  hostRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  hostAvatar: { alignItems: 'center', backgroundColor: colors.raised, borderRadius: 18, height: 38, justifyContent: 'center', overflow: 'hidden', width: 38 },
  hostCopy: { flex: 1 },
  hostName: { color: colors.text, fontSize: 12, fontWeight: '800' },
  locationBox: { alignItems: 'flex-start', backgroundColor: colors.water, borderRadius: radii.control, flexDirection: 'row', gap: 10, marginTop: spacing.lg, padding: spacing.md },
  locationBoxLocked: { backgroundColor: colors.raised },
  locationCopy: { flex: 1 },
  locationTitle: { color: colors.text, fontSize: 12, fontWeight: '800' },
  locationText: { color: colors.mutedText, fontSize: 11, lineHeight: 16, marginTop: 3 },
  progressBanner: { alignItems: 'center', backgroundColor: colors.successSurface, borderColor: colors.border, flexDirection: 'row', gap: 9 },
  progressBannerText: { color: colors.success, flex: 1, fontSize: 12, fontWeight: '700' },
  requestsLoading: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', paddingVertical: spacing.md },
  requestsSection: { backgroundColor: colors.warningSurface, borderColor: colors.border, borderRadius: radii.surface, borderWidth: 1, gap: spacing.md, padding: spacing.lg },
  sectionHeadingRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  sectionEyebrow: { color: colors.accent, fontSize: 9, fontWeight: '800', letterSpacing: 1.1 },
  sectionTitle: { ...typeScale.section, color: colors.text, marginTop: 3 },
  countBadge: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: radii.control, height: 30, justifyContent: 'center', minWidth: 30, paddingHorizontal: 8 },
  countBadgeText: { color: colors.onAccent, fontSize: 11, fontWeight: '800' },
  inlineError: { color: colors.danger, fontSize: 11, fontWeight: '700', lineHeight: 16 },
  inlineNotice: { color: colors.success, fontSize: 11, fontWeight: '800', lineHeight: 16 },
  requestCard: { alignItems: 'flex-start', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.control, borderWidth: 1, flexDirection: 'row', gap: 11, padding: 13 },
  requestAvatar: { alignItems: 'center', backgroundColor: colors.raised, borderRadius: radii.pill, height: 40, justifyContent: 'center', overflow: 'hidden', width: 40 },
  requestContent: { flex: 1 },
  requestName: { color: colors.text, fontSize: 14, fontWeight: '800' },
  requestActivity: { color: colors.mutedText, fontSize: 12, fontWeight: '700', marginTop: 2 },
  requestMeta: { color: colors.subtleText, fontSize: 10, marginTop: 4 },
  requestActions: { flexDirection: 'row', gap: 8, marginTop: 11 },
  rejectButton: { alignItems: 'center', borderColor: colors.border, borderRadius: radii.pill, borderWidth: 1, flex: 1, justifyContent: 'center', minHeight: 42 },
  rejectButtonText: { color: colors.text, fontSize: 11, fontWeight: '800' },
  acceptButton: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: radii.pill, flex: 1, justifyContent: 'center', minHeight: 42 },
  acceptButtonText: { color: colors.onAccent, fontSize: 11, fontWeight: '800' },
  leaveButton: { alignItems: 'center', alignSelf: 'flex-start', flexDirection: 'row', gap: 6, marginTop: 14, paddingHorizontal: 2, paddingVertical: 5 },
  leaveButtonText: { color: colors.danger, fontSize: 12, fontWeight: '800' },
  directionsButton: { alignItems: 'center', alignSelf: 'flex-start', flexDirection: 'row', gap: 6, marginTop: 14, paddingHorizontal: 2, paddingVertical: 5 },
  directionsButtonText: { color: colors.accent, fontSize: 12, fontWeight: '800' },
  buttonPressed: { opacity: 0.65 },
  });
}
