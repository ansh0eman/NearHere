import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
        <Text style={styles.avatarFace}>🦊</Text>
      </View>

      {session ? (
        <>
          {profileState.status === 'loading' || profileState.status === 'signedOut' ? (
            <>
              <ActivityIndicator color="#FF6B4A" style={styles.profileSpinner} />
              <Text style={styles.subtitle}>Loading your NearHere profile…</Text>
            </>
          ) : profileState.status === 'error' ? (
            <>
              <Text style={styles.title}>Your account is connected</Text>
              <Text style={styles.subtitle}>{profileState.message}</Text>
              <Pressable accessibilityRole="button" onPress={() => void refresh()} style={styles.primaryButton}>
                <Text style={styles.primaryText}>Retry profile</Text>
              </Pressable>
            </>
          ) : profileState.status === 'needsProfile' || profileState.status === 'saving' ? (
            <>
              <Text style={styles.title}>Finish your profile</Text>
              <Text style={styles.subtitle}>
                Choose the public display name people will see when you join or host an activity.
              </Text>
              <Pressable accessibilityRole="button" onPress={openProfileOnboarding} style={styles.primaryButton}>
                <Text style={styles.primaryText}>Choose display name</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.title}>{profileState.profile.displayName}</Text>
              <Text style={styles.subtitle}>
                Your phone is verified and private. Activities you join or host will connect to this account.
              </Text>
            </>
          )}
          <Pressable
            accessibilityRole="button"
            disabled={isSigningOut}
            onPress={() => void handleSignOut()}
            style={[styles.secondaryButton, isSigningOut && styles.buttonDisabled]}>
            {isSigningOut ? <ActivityIndicator color="#16202A" /> : <Text style={styles.secondaryText}>Sign out</Text>}
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.title}>Make NearHere yours</Text>
          <Text style={styles.subtitle}>
            Sign in with your phone to join activities, host plans, and build your NearHere avatar.
          </Text>
          <Pressable accessibilityRole="button" onPress={openPhoneAuth} style={styles.primaryButton}>
            <Ionicons name="phone-portrait-outline" size={18} color="#FFFFFF" />
            <Text style={styles.primaryText}>Continue with phone</Text>
          </Pressable>
          {!isConfigured && <Text style={styles.setupNote}>Supabase configuration is missing.</Text>}
        </>
      )}

      {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}
      <Text style={styles.note}>Browsing stays open. An account is required only to join or host.</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { alignItems: 'center', backgroundColor: '#F7F4EE', flex: 1, justifyContent: 'center', paddingHorizontal: 30 },
  avatar: { alignItems: 'center', backgroundColor: '#BFE9D4', borderColor: '#FFFFFF', borderRadius: 50, borderWidth: 5, height: 100, justifyContent: 'center', shadowColor: '#16202A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 18, width: 100 },
  avatarFace: { fontSize: 48 },
  buttonDisabled: { opacity: 0.5 },
  title: { color: '#16202A', fontSize: 30, fontWeight: '900', letterSpacing: -1.2, marginTop: 25, textAlign: 'center' },
  subtitle: { color: '#66717D', fontSize: 15, lineHeight: 23, marginTop: 10, maxWidth: 330, textAlign: 'center' },
  primaryButton: { alignItems: 'center', backgroundColor: '#FF6B4A', borderRadius: 999, flexDirection: 'row', gap: 9, marginTop: 28, paddingHorizontal: 22, paddingVertical: 15 },
  primaryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  profileSpinner: { marginTop: 25 },
  secondaryButton: { borderColor: 'rgba(22,32,42,0.16)', borderRadius: 999, borderWidth: 1, marginTop: 25, paddingHorizontal: 22, paddingVertical: 13 },
  secondaryText: { color: '#16202A', fontSize: 13, fontWeight: '900' },
  setupNote: { color: '#A45B20', fontSize: 11, lineHeight: 16, marginTop: 12, textAlign: 'center' },
  error: { color: '#B63B2B', fontSize: 12, fontWeight: '700', marginTop: 13, textAlign: 'center' },
  note: { color: '#89919A', fontSize: 11, lineHeight: 17, marginTop: 17, maxWidth: 270, textAlign: 'center' },
});
