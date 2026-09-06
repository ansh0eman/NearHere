import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useMyPlans } from '@/hooks/use-my-plans';
import { useMembershipRequests } from '@/hooks/use-membership-requests';
import { useAuth } from '@/providers/auth-provider';
import type { HostedMembershipRequest, MyPlanSummary } from '@/types/activity';

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
            <ActivityIndicator color="#FF6B4A" />
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
                {leavingActivityId && <ActivityIndicator color="#3E8E68" size="small" />}
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
                <ActivityIndicator color="#FF6B4A" size="small" />
                <Text style={styles.refreshText}>Refreshing plans…</Text>
              </View>
            )}
            {state.status === 'error' && (
              <Pressable accessibilityRole="button" onPress={() => void refresh()} style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{state.message} Tap to retry.</Text>
              </Pressable>
            )}
            {state.plans.map((plan) => (
              <PlanCard
                key={plan.id}
                onLeave={() => confirmLeave(plan)}
                onOpen={() => router.push({ pathname: '/activity/[id]', params: { id: plan.id } })}
                plan={plan}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function PlanCard({
  onLeave,
  onOpen,
  plan,
}: {
  onLeave: () => void;
  onOpen: () => void;
  plan: MyPlanSummary;
}) {
  const isHost = plan.membershipRole === 'host';
  const meetingPoint = plan.exactMeetingLocation;
  const hasEnded = new Date(plan.endsAt).getTime() <= Date.now();
  const isInactive = plan.status !== 'published' || hasEnded;
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
          <Ionicons color="#66717D" name="time-outline" size={16} />
          <Text style={styles.detailText}>{formatPlanTime(plan.startsAt)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons color="#66717D" name="people-outline" size={16} />
          <Text style={styles.detailText}>
            {plan.participantCount}/{plan.capacity} {isInactive ? 'participants' : 'going'} · Hosted by{' '}
            {plan.hostDisplayName}
          </Text>
        </View>

        <View style={[styles.locationBox, !meetingPoint && styles.locationBoxLocked]}>
          <Ionicons
            color={meetingPoint ? '#3E8E68' : '#8A929A'}
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
      {!isHost && !isInactive && (
        <Pressable
          accessibilityLabel={`Leave ${plan.title}`}
          accessibilityRole="button"
          onPress={onLeave}
          style={({ pressed }) => [styles.leaveButton, pressed && styles.buttonPressed]}>
          <Ionicons color="#9D3E2B" name="exit-outline" size={17} />
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
  if (state.status === 'signedOut' || (state.status === 'ready' && state.requests.length === 0)) {
    return null;
  }
  if (state.status === 'loading' && state.requests.length === 0) {
    return (
      <View style={styles.requestsLoading}>
        <ActivityIndicator color="#FF6B4A" size="small" />
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
  return (
    <View style={styles.requestCard}>
      <View style={styles.requestAvatar}>
        <Text style={styles.requestAvatarText}>{request.requesterDisplayName.slice(0, 1).toUpperCase()}</Text>
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
            {isDeciding ? <ActivityIndicator color="#FFFFFF" size="small" /> : (
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
  return (
    <View style={styles.centerState}>
      <View style={styles.emptyIcon}>
        <Ionicons color="#FF6B4A" name={icon} size={29} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.stateBody}>{body}</Text>
      <Pressable accessibilityRole="button" onPress={onPress} style={styles.button}>
        <Text style={styles.buttonText}>{buttonLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#F7F4EE', flex: 1 },
  content: { flexGrow: 1, paddingBottom: 110, paddingHorizontal: 22 },
  header: { paddingTop: 24 },
  eyebrow: { color: '#66717D', fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  title: { color: '#16202A', fontSize: 42, fontWeight: '900', letterSpacing: -1.8, marginTop: 8 },
  subtitle: { color: '#66717D', fontSize: 15, lineHeight: 22, marginTop: 7 },
  centerState: { alignItems: 'center', flex: 1, justifyContent: 'center', minHeight: 430, paddingHorizontal: 22 },
  emptyIcon: { alignItems: 'center', backgroundColor: '#FFE7DE', borderRadius: 28, height: 56, justifyContent: 'center', width: 56 },
  emptyTitle: { color: '#16202A', fontSize: 22, fontWeight: '900', letterSpacing: -0.6, marginTop: 20, textAlign: 'center' },
  stateBody: { color: '#66717D', fontSize: 14, lineHeight: 21, marginTop: 8, maxWidth: 300, textAlign: 'center' },
  button: { backgroundColor: '#16202A', borderRadius: 999, marginTop: 22, paddingHorizontal: 19, paddingVertical: 13 },
  buttonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  list: { gap: 14, marginTop: 24 },
  refreshRow: { alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'center' },
  refreshText: { color: '#66717D', fontSize: 12, fontWeight: '700' },
  errorBanner: { backgroundColor: '#FFE7DE', borderRadius: 14, padding: 13 },
  errorBannerText: { color: '#9D3E2B', fontSize: 12, fontWeight: '700', lineHeight: 17 },
  card: { backgroundColor: '#FFFFFF', borderColor: 'rgba(22,32,42,0.08)', borderRadius: 24, borderWidth: 1, padding: 18 },
  cardTopRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  kind: { color: '#FF6B4A', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  statusPill: { backgroundColor: '#DDF1E6', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  statusPillMuted: { backgroundColor: '#F0ECE4' },
  statusText: { color: '#33414E', fontSize: 10, fontWeight: '900' },
  cardTitle: { color: '#16202A', fontSize: 21, fontWeight: '900', letterSpacing: -0.5, marginBottom: 12, marginTop: 12 },
  detailRow: { alignItems: 'center', flexDirection: 'row', gap: 7, marginTop: 7 },
  detailText: { color: '#66717D', flex: 1, fontSize: 12, lineHeight: 17 },
  locationBox: { alignItems: 'flex-start', backgroundColor: '#ECF7F0', borderRadius: 16, flexDirection: 'row', gap: 10, marginTop: 16, padding: 13 },
  locationBoxLocked: { backgroundColor: '#F4F1EB' },
  locationCopy: { flex: 1 },
  locationTitle: { color: '#33414E', fontSize: 12, fontWeight: '900' },
  locationText: { color: '#66717D', fontSize: 11, lineHeight: 16, marginTop: 3 },
  progressBanner: { alignItems: 'center', backgroundColor: '#ECF7F0', flexDirection: 'row', gap: 9 },
  progressBannerText: { color: '#316E53', flex: 1, fontSize: 12, fontWeight: '800' },
  requestsLoading: { alignItems: 'center', flexDirection: 'row', gap: 8, justifyContent: 'center', paddingVertical: 12 },
  requestsSection: { backgroundColor: '#FFF4E5', borderColor: 'rgba(206,126,36,0.15)', borderRadius: 24, borderWidth: 1, gap: 10, padding: 16 },
  sectionHeadingRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  sectionEyebrow: { color: '#A96422', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  sectionTitle: { color: '#16202A', fontSize: 20, fontWeight: '900', letterSpacing: -0.4, marginTop: 3 },
  countBadge: { alignItems: 'center', backgroundColor: '#16202A', borderRadius: 14, height: 28, justifyContent: 'center', minWidth: 28, paddingHorizontal: 8 },
  countBadgeText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  inlineError: { color: '#9D3E2B', fontSize: 11, fontWeight: '700', lineHeight: 16 },
  inlineNotice: { color: '#316E53', fontSize: 11, fontWeight: '800', lineHeight: 16 },
  requestCard: { alignItems: 'flex-start', backgroundColor: '#FFFFFF', borderRadius: 18, flexDirection: 'row', gap: 11, padding: 13 },
  requestAvatar: { alignItems: 'center', backgroundColor: '#FFE7DE', borderRadius: 20, height: 40, justifyContent: 'center', width: 40 },
  requestAvatarText: { color: '#9D3E2B', fontSize: 15, fontWeight: '900' },
  requestContent: { flex: 1 },
  requestName: { color: '#16202A', fontSize: 14, fontWeight: '900' },
  requestActivity: { color: '#4D5A66', fontSize: 12, fontWeight: '700', marginTop: 2 },
  requestMeta: { color: '#7A838C', fontSize: 10, marginTop: 4 },
  requestActions: { flexDirection: 'row', gap: 8, marginTop: 11 },
  rejectButton: { alignItems: 'center', borderColor: '#D7D1C8', borderRadius: 999, borderWidth: 1, flex: 1, justifyContent: 'center', minHeight: 38 },
  rejectButtonText: { color: '#4D5A66', fontSize: 11, fontWeight: '900' },
  acceptButton: { alignItems: 'center', backgroundColor: '#3E8E68', borderRadius: 999, flex: 1, justifyContent: 'center', minHeight: 38 },
  acceptButtonText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  leaveButton: { alignItems: 'center', alignSelf: 'flex-start', flexDirection: 'row', gap: 6, marginTop: 14, paddingHorizontal: 2, paddingVertical: 5 },
  leaveButtonText: { color: '#9D3E2B', fontSize: 12, fontWeight: '900' },
  buttonPressed: { opacity: 0.65 },
});
