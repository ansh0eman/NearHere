import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useMyPlans } from '@/hooks/use-my-plans';
import { useAuth } from '@/providers/auth-provider';
import type { MyPlanSummary } from '@/types/activity';

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
  const { refresh, state } = useMyPlans(session?.user.id ?? null);

  useFocusEffect(
    useCallback(() => {
      if (session) void refresh();
    }, [refresh, session]),
  );

  function beginSignIn() {
    setPendingIntent({ kind: 'openPlans' });
    router.push('/auth/phone');
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
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function PlanCard({ plan }: { plan: MyPlanSummary }) {
  const isHost = plan.membershipRole === 'host';
  const meetingPoint = plan.exactMeetingLocation;
  const hasEnded = new Date(plan.endsAt).getTime() <= Date.now();
  const isInactive = plan.status !== 'published' || hasEnded;
  const membershipLabel = isInactive
    ? plan.status === 'cancelled' ? 'Cancelled' : 'Ended'
    : isHost ? 'Hosting' : STATUS_LABELS[plan.membershipStatus];

  return (
    <View style={styles.card}>
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
});
