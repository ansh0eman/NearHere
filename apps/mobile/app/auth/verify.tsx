import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { colors, radii, spacing, typeScale } from '@/constants/design-tokens';
import { useAuth } from '@/providers/auth-provider';

export default function VerifyScreen() {
  const router = useRouter();
  const { pendingIntent, pendingPhone, status, verifyOtp } = useAuth();
  const [code, setCode] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const isVerifying = status === 'verifyingCode';

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, (event) => setKeyboardHeight(event.endCoordinates.height));
    const hideSubscription = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => { showSubscription.remove(); hideSubscription.remove(); };
  }, []);

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
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
        <Pressable
          accessibilityLabel="Back to phone number"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.backButton}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
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
          placeholderTextColor={colors.subtleText}
          style={styles.codeInput}
          textContentType="oneTimeCode"
          value={code}
        />

        {pendingIntent && (
          <Text style={styles.intentText}>
            After verification, NearHere will restore your{' '}
            {pendingIntent.kind === 'joinActivity'
              ? 'join request'
              : pendingIntent.kind === 'hostActivity'
                ? 'host flow'
                : pendingIntent.kind === 'openPlans'
                  ? 'plans'
                  : 'account'}.
          </Text>
        )}
        {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}

        <Button label="Verify and continue" loading={isVerifying} disabled={!pendingPhone} onPress={() => void verifyCode()} style={styles.primaryButton} />
        </ScrollView>
        {keyboardHeight > 0 ? <Pressable accessibilityLabel="Dismiss keyboard" accessibilityRole="button" onPress={Keyboard.dismiss} style={[styles.keyboardDismissButton, { bottom: keyboardHeight + 10 }]}><Text style={styles.doneKeyboardText}>Done</Text></Pressable> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.canvas, flex: 1 },
  content: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24 },
  backButton: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.pill, borderWidth: 1, height: 44, justifyContent: 'center', marginTop: 8, width: 44 },
  eyebrow: { ...typeScale.label, color: colors.accent, letterSpacing: 1.3, marginTop: 58 },
  title: { ...typeScale.title, color: colors.text, fontSize: 38, marginTop: 8 },
  subtitle: { ...typeScale.secondary, color: colors.mutedText, fontSize: 15, marginTop: 10 },
  codeInput: { color: colors.text, fontSize: 42, fontWeight: '700', letterSpacing: 13, marginTop: 45, paddingVertical: 12, textAlign: 'center' },
  intentText: { ...typeScale.label, color: colors.mutedText, lineHeight: 18, marginTop: 22, textAlign: 'center' },
  error: { ...typeScale.label, color: colors.danger, lineHeight: 17, marginTop: 14, textAlign: 'center' },
  primaryButton: { marginBottom: spacing.lg, marginTop: 'auto', minHeight: 54 },
  keyboardDismissButton: { alignItems: 'center', backgroundColor: colors.raised, borderColor: colors.border, borderRadius: radii.pill, borderWidth: 1, paddingHorizontal: 17, paddingVertical: 10, position: 'absolute', right: 24 },
  doneKeyboardText: { color: colors.text, fontSize: 13, fontWeight: '700' },
});
