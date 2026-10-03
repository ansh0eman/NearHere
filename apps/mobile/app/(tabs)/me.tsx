import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HostAvatar } from '@/components/host-avatar';
import { ProfileHero } from '@/components/profile-hero';
import { avatarChoice, avatarSeed } from '@/lib/avatar-identity';
import { Button } from '@/components/ui/button';
import { radii, spacing, typeScale } from '@/constants/design-tokens';

import { useAuth } from '@/providers/auth-provider';
import { useProfile } from '@/providers/profile-provider';
import { useMyPlans } from '@/hooks/use-my-plans';
import { partitionPlans } from '@/lib/plan-utils';
import { useTheme } from '@/providers/theme-provider';

export default function MeScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { isConfigured, session, setPendingIntent, signOut } = useAuth();
  const { refresh, state: profileState } = useProfile();
  const { refresh: refreshPlans, state: plansState } = useMyPlans(session?.user.id ?? null);
  const upcoming = partitionPlans(plansState.plans).upcoming.slice(0, 3);
  useFocusEffect(useCallback(() => { void refreshPlans(); }, [refreshPlans]));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  function openPhoneAuth() {
    setPendingIntent({ kind: 'openAccount' });
    router.push('/auth/phone');
  }

  async function handleSignOut() {
    setErrorMessage(null);
    setIsSigningOut(true);
    const result = await signOut();
    setIsSigningOut(false);
    if (!result.ok) setErrorMessage(result.message);
  }

  function openProfileOnboarding() {
    router.push('/onboarding/profile');
  }

  function openAvatarStudio() {
    router.push('/avatar-studio' as never);
  }

  function openUsername() {
    router.push('/settings/username' as never);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
      {profileState.status !== 'ready' && <View style={styles.avatar}>
        <HostAvatar
          seed={avatarSeed(profileState.profile?.avatarConfig, session?.user.id ?? 'nearhere')}
          avatarId={profileState.profile ? avatarChoice(profileState.profile.avatarConfig, profileState.profile.id) : undefined}
          size={190}
        />
      </View>}

      {session ? (
        <>
          {profileState.status === 'loading' || profileState.status === 'signedOut' ? (
            <>
              <ActivityIndicator color={colors.accent} style={styles.profileSpinner} />
              <Text style={styles.subtitle}>Loading your NearHere profile…</Text>
            </>
          ) : profileState.status === 'error' ? (
            <>
              <Text style={styles.title}>Your account is connected</Text>
              <Text style={styles.subtitle}>{profileState.message}</Text>
              <Button label="Retry profile" onPress={() => void refresh()} style={styles.primaryButton} />
            </>
          ) : profileState.status === 'needsProfile' || profileState.status === 'saving' ? (
            <>
              <Text style={styles.title}>Finish your profile</Text>
              <Text style={styles.subtitle}>
                Choose the public display name people will see when you join or host an activity.
              </Text>
              <Button label="Choose display name" onPress={openProfileOnboarding} style={styles.primaryButton} />
            </>
          ) : (
            <>
              <ProfileHero profile={profileState.profile} onEdit={openProfileOnboarding} onAvatarStudio={openAvatarStudio} />
              <Pressable accessibilityRole="button" onPress={openUsername} style={styles.secondaryButton}>
                <Text style={styles.secondaryText}>{profileState.profile.username ? `@${profileState.profile.username}` : 'Claim a username'}</Text>
              </Pressable>
              <View style={styles.plans}>
                <Text style={styles.sectionTitle}>Upcoming plans</Text>
                {plansState.status === 'loading' && <ActivityIndicator color={colors.accent} />}
                {plansState.status === 'error' && <Button label="Retry plans" variant="quiet" onPress={() => void refreshPlans()} />}
                {plansState.status === 'ready' && upcoming.length === 0 && <View>
                  <Text style={styles.emptyText}>A little room for something spontaneous.</Text>
                  <Button label="Explore nearby" variant="quiet" onPress={() => router.push('/(tabs)')} />
                </View>}
                {plansState.status === 'ready' && upcoming.map(plan => (
                  <Pressable key={plan.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/activity/[id]', params: { id: plan.id } })} style={styles.planRow}>
                    <Text style={styles.planTitle}>{plan.title}</Text>
                    <Text style={styles.planMeta}>{new Date(plan.startsAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} · {plan.membershipRole === 'host' ? 'Hosting' : plan.membershipStatus === 'accepted' ? 'Going' : plan.membershipStatus === 'pending' ? 'Requested' : 'Waitlisted'}</Text>
                  </Pressable>
                ))}
                <Button label="See all plans" variant="quiet" onPress={() => router.push('/(tabs)/plans')} />
              </View>
            </>
          )}
          <Pressable
            accessibilityRole="button"
            disabled={isSigningOut}
            onPress={() => void handleSignOut()}
            style={[styles.secondaryButton, isSigningOut && styles.buttonDisabled]}>
            {isSigningOut ? <ActivityIndicator color={colors.text} /> : <Text style={styles.secondaryText}>Sign out</Text>}
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.title}>Make NearHere yours</Text>
          <Text style={styles.subtitle}>
            Sign in with your phone to join activities, host plans, and build your NearHere avatar.
          </Text>
          <Button label="Continue with phone" icon="phone-portrait-outline" onPress={openPhoneAuth} style={styles.primaryButton} />
          {!isConfigured && <Text style={styles.setupNote}>Supabase configuration is missing.</Text>}
        </>
      )}

      <Pressable accessibilityRole="button" onPress={() => router.push('/settings/appearance')} style={styles.secondaryButton}>
        <Text style={styles.secondaryText}>Appearance</Text>
      </Pressable>
      {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}
      <Text style={styles.note}>Browsing stays open. An account is required only to join or host.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
  screen: { backgroundColor: colors.canvas, flex: 1 },
  content: { alignItems: 'center', flexGrow: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xxl },
  emptyText: { ...typeScale.secondary, color: colors.mutedText, paddingVertical: spacing.sm },
  avatar: { alignItems: 'center', backgroundColor: 'transparent', height: 205, justifyContent: 'center', width: 180 },
  plans: { alignSelf: 'stretch', marginTop: spacing.xl },
  sectionTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: spacing.sm },
  planRow: { borderBottomColor: colors.border, borderBottomWidth: 1, minHeight: 60, paddingVertical: spacing.md },
  planTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  planMeta: { color: colors.mutedText, fontSize: 12, lineHeight: 18, marginTop: spacing.xs },
  buttonDisabled: { opacity: 0.5 },
  title: { ...typeScale.title, color: colors.text, marginTop: spacing.xl, textAlign: 'center' },
  subtitle: { ...typeScale.secondary, color: colors.mutedText, fontSize: 15, lineHeight: 23, marginTop: spacing.md, maxWidth: 330, textAlign: 'center' },
  primaryButton: { marginTop: spacing.xl, minWidth: 190 },
  primaryText: { color: colors.onAccent, fontSize: 14, fontWeight: '700' },
  profileSpinner: { marginTop: spacing.xl },
  secondaryButton: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.control, borderWidth: 1, marginTop: spacing.xl, minHeight: 48, justifyContent: 'center', paddingHorizontal: 22, paddingVertical: 13 },
  secondaryText: { color: colors.text, fontSize: 13, fontWeight: '700' },
  setupNote: { color: colors.accent, fontSize: 11, lineHeight: 16, marginTop: spacing.md, textAlign: 'center' },
  error: { color: colors.danger, fontSize: 12, fontWeight: '700', marginTop: 13, textAlign: 'center' },
  note: { color: colors.subtleText, fontSize: 11, lineHeight: 17, marginTop: spacing.lg, maxWidth: 270, textAlign: 'center' },
  });
}
