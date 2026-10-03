import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { radii, spacing, typeScale } from '@/constants/design-tokens';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';

export default function VerifyScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const scrollRef = useRef<ScrollView>(null);
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

  useEffect(() => {
    const timer = setTimeout(() => {
      if (keyboardHeight > 0) scrollRef.current?.scrollToEnd({ animated: true });
      else scrollRef.current?.scrollTo({ y: 0, animated: false });
    }, 80);
    return () => clearTimeout(timer);
  }, [keyboardHeight]);

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
        behavior={Platform.OS === 'android' ? 'height' : undefined}
        style={styles.content}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Back to phone number"
            accessibilityRole="button"
            onPress={() => router.back()}
            style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
        </View>
        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, keyboardHeight > 0 && { paddingBottom: keyboardHeight + 100 }]}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
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

        </ScrollView>
        <View style={[styles.footer, Platform.OS === 'ios' && keyboardHeight > 0 && styles.iosKeyboardFooter, Platform.OS === 'ios' && keyboardHeight > 0 && { bottom: keyboardHeight + spacing.sm }]}>
          <Button label="Verify and continue" loading={isVerifying} disabled={!pendingPhone} onPress={() => void verifyCode()} style={[styles.primaryButton, Platform.OS === 'ios' && keyboardHeight > 0 && styles.iosPrimaryButton]} />
          {keyboardHeight > 0 ? <Pressable accessibilityLabel="Dismiss keyboard" accessibilityRole="button" onPress={Keyboard.dismiss} style={styles.keyboardDismissButton}><Text style={styles.doneKeyboardText}>Done</Text></Pressable> : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
  screen: { backgroundColor: colors.canvas, flex: 1 },
  content: { flex: 1 },
  header: { height: 60, justifyContent: 'center', paddingHorizontal: 24 },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: spacing.md },
  backButton: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.pill, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 },
  eyebrow: { ...typeScale.label, color: colors.accent, letterSpacing: 1.3, marginTop: 58 },
  title: { ...typeScale.title, color: colors.text, fontSize: 38, marginTop: 8 },
  subtitle: { ...typeScale.secondary, color: colors.mutedText, fontSize: 15, marginTop: 10 },
  codeInput: { color: colors.text, fontSize: 42, fontWeight: '700', letterSpacing: 13, marginTop: 45, paddingVertical: 12, textAlign: 'center' },
  intentText: { ...typeScale.label, color: colors.mutedText, lineHeight: 18, marginTop: 22, textAlign: 'center' },
  error: { ...typeScale.label, color: colors.danger, lineHeight: 17, marginTop: 14, textAlign: 'center' },
  footer: { backgroundColor: colors.canvas, paddingHorizontal: 24, paddingTop: spacing.sm, paddingBottom: spacing.md },
  iosKeyboardFooter: { flexDirection: 'row', gap: spacing.sm, left: 0, position: 'absolute', right: 0 },
  primaryButton: { minHeight: 54 },
  iosPrimaryButton: { flex: 1 },
  keyboardDismissButton: { alignItems: 'center', backgroundColor: colors.raised, borderColor: colors.border, borderRadius: radii.pill, borderWidth: 1, justifyContent: 'center', minHeight: 54, paddingHorizontal: 17 },
  doneKeyboardText: { color: colors.text, fontSize: 13, fontWeight: '700' },
  });
}
