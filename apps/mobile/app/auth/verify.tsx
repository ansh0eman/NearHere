import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/providers/auth-provider';

export default function VerifyScreen() {
  const router = useRouter();
  const { pendingIntent, pendingPhone, status, verifyOtp } = useAuth();
  const [code, setCode] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isVerifying = status === 'verifyingCode';

  async function verifyCode() {
    setErrorMessage(null);
    if (!/^\d{6}$/.test(code)) {
      setErrorMessage('Enter the six-digit code from the SMS.');
      return;
    }

    const result = await verifyOtp(code);
    if (!result.ok) {
      setErrorMessage(result.message);
      return;
    }

    router.dismissAll();
    router.replace('/onboarding/profile');
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.content}>
        <Pressable
          accessibilityLabel="Back to phone number"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color="#16202A" />
        </Pressable>

        <Text style={styles.eyebrow}>VERIFY YOUR PHONE</Text>
        <Text style={styles.title}>Enter the code</Text>
        <Text style={styles.subtitle}>
          {pendingPhone ? `We sent a code to ${pendingPhone}.` : 'Request a new code from the previous screen.'}
        </Text>

        <TextInput
          accessibilityLabel="One-time code"
          autoComplete="one-time-code"
          autoFocus
          keyboardType="number-pad"
          maxLength={6}
          onChangeText={(value) => setCode(value.replace(/\D/g, ''))}
          placeholder="000000"
          placeholderTextColor="#C0C4C8"
          style={styles.codeInput}
          textContentType="oneTimeCode"
          value={code}
        />

        {pendingIntent && (
          <Text style={styles.intentText}>
            After verification, NearHere will restore your{' '}
            {pendingIntent.kind === 'joinActivity' ? 'join request' : pendingIntent.kind === 'hostActivity' ? 'host flow' : 'account'}.
          </Text>
        )}
        {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}

        <Pressable
          accessibilityRole="button"
          disabled={isVerifying || !pendingPhone}
          onPress={() => void verifyCode()}
          style={[styles.primaryButton, (isVerifying || !pendingPhone) && styles.primaryButtonDisabled]}>
          {isVerifying ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryText}>Verify and continue</Text>
          )}
        </Pressable>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#F7F4EE', flex: 1 },
  content: { flex: 1, paddingHorizontal: 24 },
  backButton: { alignItems: 'center', borderColor: 'rgba(22,32,42,0.12)', borderRadius: 22, borderWidth: 1, height: 44, justifyContent: 'center', marginTop: 8, width: 44 },
  eyebrow: { color: '#FF6B4A', fontSize: 10, fontWeight: '900', letterSpacing: 1.3, marginTop: 58 },
  title: { color: '#16202A', fontSize: 40, fontWeight: '900', letterSpacing: -1.7, marginTop: 8 },
  subtitle: { color: '#66717D', fontSize: 15, lineHeight: 22, marginTop: 10 },
  codeInput: { color: '#16202A', fontSize: 42, fontWeight: '900', letterSpacing: 13, marginTop: 45, paddingVertical: 12, textAlign: 'center' },
  intentText: { color: '#66717D', fontSize: 12, lineHeight: 18, marginTop: 22, textAlign: 'center' },
  error: { color: '#B63B2B', fontSize: 12, fontWeight: '700', lineHeight: 17, marginTop: 14, textAlign: 'center' },
  primaryButton: { alignItems: 'center', backgroundColor: '#16202A', borderRadius: 999, justifyContent: 'center', marginBottom: 18, marginTop: 'auto', minHeight: 54, paddingHorizontal: 20 },
  primaryButtonDisabled: { opacity: 0.45 },
  primaryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
});
