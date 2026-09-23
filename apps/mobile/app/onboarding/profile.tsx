import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { validateDisplayName } from '@/lib/profile-validation';
import { useProfile } from '@/providers/profile-provider';

export default function ProfileOnboardingScreen() {
  const router = useRouter();
  const { completeProfile, refresh, state } = useProfile();
  const [displayName, setDisplayName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (state.status === 'ready') router.replace('/');
  }, [router, state.status]);

  async function saveProfile() {
    setErrorMessage(null);
    const validation = validateDisplayName(displayName);
    if (!validation.ok) {
      setErrorMessage(validation.message);
      return;
    }

    const result = await completeProfile(validation.value);
    if (!result.ok) {
      setErrorMessage(result.message);
      return;
    }

    router.replace('/');
  }

  if (state.status === 'loading' || state.status === 'signedOut') {
    return (
      <SafeAreaView style={styles.centeredScreen}>
        <ActivityIndicator color="#FF6B4A" />
        <Text style={styles.helperText}>Preparing your NearHere profile…</Text>
      </SafeAreaView>
    );
  }

  if (state.status === 'error') {
    return (
      <SafeAreaView style={styles.centeredScreen}>
        <View style={styles.warningIcon}>
          <Ionicons name="cloud-offline-outline" color="#B63B2B" size={25} />
        </View>
        <Text style={styles.errorTitle}>Your profile did not load</Text>
        <Text style={styles.helperText}>{state.message}</Text>
        <Pressable accessibilityRole="button" onPress={() => void refresh()} style={styles.retryButton}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (state.status === 'ready') return null;

  const isSaving = state.status === 'saving';

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.content}>
        <View style={styles.avatar}>
          <Text style={styles.avatarFace}>🦊</Text>
        </View>
        <Text style={styles.eyebrow}>ONE LAST STEP</Text>
        <Text style={styles.title}>What should people call you?</Text>
        <Text style={styles.subtitle}>
          This name appears on activities you join or host. Your phone number stays private.
        </Text>

        <Text style={styles.label}>DISPLAY NAME</Text>
        <TextInput
          accessibilityLabel="Display name"
          autoCapitalize="words"
          autoComplete="name"
          autoFocus
          editable={!isSaving}
          maxLength={40}
          onChangeText={(value) => {
            setDisplayName(value);
            setErrorMessage(null);
          }}
          onSubmitEditing={() => void saveProfile()}
          placeholder="For example, Anshuman"
          placeholderTextColor="#A3A9AF"
          returnKeyType="done"
          style={styles.input}
          value={displayName}
        />
        <Text style={styles.counter}>{displayName.trim().length}/40</Text>

        {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}

        <Pressable
          accessibilityRole="button"
          disabled={isSaving}
          onPress={() => void saveProfile()}
          style={[styles.primaryButton, isSaving && styles.primaryButtonDisabled]}>
          {isSaving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>Start exploring</Text>}
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', backgroundColor: '#BFE9D4', borderColor: '#FFFFFF', borderRadius: 42, borderWidth: 4, height: 84, justifyContent: 'center', marginTop: 30, width: 84 },
  avatarFace: { fontSize: 40 },
  centeredScreen: { alignItems: 'center', backgroundColor: '#F7F4EE', flex: 1, justifyContent: 'center', paddingHorizontal: 30 },
  content: { flex: 1, paddingHorizontal: 24 },
  counter: { color: '#89919A', fontSize: 11, marginTop: 7, textAlign: 'right' },
  error: { color: '#B63B2B', fontSize: 12, fontWeight: '700', lineHeight: 17, marginTop: 12 },
  errorTitle: { color: '#16202A', fontSize: 24, fontWeight: '900', letterSpacing: -0.7, marginTop: 18, textAlign: 'center' },
  eyebrow: { color: '#FF6B4A', fontSize: 10, fontWeight: '900', letterSpacing: 1.3, marginTop: 32 },
  helperText: { color: '#66717D', fontSize: 14, lineHeight: 21, marginTop: 12, maxWidth: 310, textAlign: 'center' },
  input: { backgroundColor: '#FFFFFF', borderColor: 'rgba(22,32,42,0.12)', borderRadius: 16, borderWidth: 1, color: '#16202A', fontSize: 17, fontWeight: '700', marginTop: 9, minHeight: 58, paddingHorizontal: 17 },
  label: { color: '#66717D', fontSize: 10, fontWeight: '900', letterSpacing: 1.1, marginTop: 34 },
  primaryButton: { alignItems: 'center', backgroundColor: '#16202A', borderRadius: 999, justifyContent: 'center', marginBottom: 18, marginTop: 'auto', minHeight: 54, paddingHorizontal: 20 },
  primaryButtonDisabled: { opacity: 0.5 },
  primaryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  retryButton: { backgroundColor: '#16202A', borderRadius: 999, marginTop: 24, paddingHorizontal: 24, paddingVertical: 14 },
  retryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  screen: { backgroundColor: '#F7F4EE', flex: 1 },
  subtitle: { color: '#66717D', fontSize: 15, lineHeight: 22, marginTop: 12, maxWidth: 340 },
  title: { color: '#16202A', fontSize: 36, fontWeight: '900', letterSpacing: -1.4, lineHeight: 40, marginTop: 9, maxWidth: 340 },
  warningIcon: { alignItems: 'center', backgroundColor: '#FBE4DF', borderRadius: 26, height: 52, justifyContent: 'center', width: 52 },
});
