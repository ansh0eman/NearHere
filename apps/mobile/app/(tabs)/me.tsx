import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HostAvatar } from '@/components/host-avatar';
import { avatarChoice, avatarSeed } from '@/lib/avatar-identity';
import { Button } from '@/components/ui/button';
import { colors, radii, spacing, typeScale } from '@/constants/design-tokens';

import { useAuth } from '@/providers/auth-provider';
import { useProfile } from '@/providers/profile-provider';

export default function MeScreen() {
  const router = useRouter();
  const { isConfigured, session, setPendingIntent, signOut } = useAuth();
  const { refresh, state: profileState } = useProfile();
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

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.avatar}>
        <HostAvatar
          seed={avatarSeed(profileState.profile?.avatarConfig, session?.user.id ?? 'nearhere')}
          avatarId={profileState.profile ? avatarChoice(profileState.profile.avatarConfig, profileState.profile.id) : undefined}
          size={190}
        />
      </View>

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
              <Text style={styles.title}>{profileState.profile.displayName}</Text>
              <Text style={styles.subtitle}>
                Your phone is verified and private. Activities you join or host will connect to this account.
              </Text>
              <Button label="Edit profile" variant="secondary" onPress={openProfileOnboarding} style={styles.primaryButton} />
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

      {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}
      <Text style={styles.note}>Browsing stays open. An account is required only to join or host.</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { alignItems: 'center', backgroundColor: colors.canvas, flex: 1, justifyContent: 'center', paddingHorizontal: 30 },
  avatar: { alignItems: 'center', backgroundColor: 'transparent', height: 205, justifyContent: 'center', width: 180 },
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
