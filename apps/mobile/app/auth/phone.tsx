import { Ionicons } from '@expo/vector-icons';
import { type Href, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { radii, spacing, typeScale } from '@/constants/design-tokens';
import { isValidE164PhoneNumber, normalizePhoneNumber } from '@/lib/phone-number';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';

export default function PhoneScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const scrollRef = useRef<ScrollView>(null);
  const { isConfigured, requestOtp, setPendingIntent, status } = useAuth();
  const [phone, setPhone] = useState('+91 ');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const normalizedPhone = normalizePhoneNumber(phone);
  const isSending = status === 'sendingCode';

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

  async function sendCode() {
    setErrorMessage(null);
    if (!isValidE164PhoneNumber(phone)) {
      setErrorMessage('Enter a complete phone number with its country code, for example +91 98765 43210.');
      return;
    }

    const result = await requestOtp(normalizedPhone);
    if (!result.ok) {
      setErrorMessage(result.message);
      return;
    }

    router.push('/auth/verify');
  }

  function cancelSignIn() {
    setPendingIntent(null);
    router.back();
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'android' ? 'height' : undefined}
        style={styles.content}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Close phone sign in"
            accessibilityRole="button"
            onPress={cancelSignIn}
            style={styles.closeButton}>
            <Ionicons name="close" size={23} color={colors.text} />
          </Pressable>
        </View>
        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, keyboardHeight > 0 && { paddingBottom: keyboardHeight + 100 }]}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.iconWrap}>
            <Ionicons name="phone-portrait-outline" size={29} color={colors.accent} />
          </View>
          <Text style={styles.eyebrow}>YOUR NEARHERE ACCOUNT</Text>
          <Text style={styles.title}>Continue with your phone</Text>
          <Text style={styles.subtitle}>
            We will send a one-time code. Your account is required to join or host, but not to browse.
          </Text>
        </View>

        {!isConfigured && (
          <View style={styles.setupCard}>
            <Ionicons name="construct-outline" size={20} color={colors.accent} />
            <View style={styles.setupCopy}>
              <Text style={styles.setupTitle}>Backend setup required</Text>
              <Text style={styles.setupBody}>
                This screen is real, but SMS remains disabled until Supabase and an SMS provider are configured.
              </Text>
            </View>
          </View>
        )}

        <View style={styles.form}>
          <Field
            label="Phone number"
            autoComplete="tel"
            autoFocus
            keyboardType="phone-pad"
            onChangeText={setPhone}
            placeholder="+91 98765 43210"
            helper="Include the country code. We normalize it before sending."
            error={errorMessage}
            value={phone}
          />
        </View>

        </ScrollView>
        <View style={[styles.footer, Platform.OS === 'ios' && keyboardHeight > 0 && styles.iosKeyboardFooter, Platform.OS === 'ios' && keyboardHeight > 0 && { bottom: keyboardHeight + spacing.sm }]}>
          <Button label="Send one-time code" icon="arrow-forward" loading={isSending} onPress={() => void sendCode()} style={[styles.primaryButton, Platform.OS === 'ios' && keyboardHeight > 0 && styles.iosPrimaryButton]} />
          {keyboardHeight > 0 ? <Pressable accessibilityLabel="Dismiss keyboard" accessibilityRole="button" onPress={Keyboard.dismiss} style={styles.keyboardDismissButton}><Text style={styles.doneKeyboardText}>Done</Text></Pressable> : null}
        </View>
        {keyboardHeight === 0 ? <Pressable accessibilityRole="button" accessibilityLabel="Continue with email instead" onPress={() => router.push('/auth/email' as Href)} style={styles.emailLink}><Text style={styles.emailLinkText}>Continue with email instead</Text></Pressable> : null}
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
  closeButton: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.pill, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 },
  hero: { marginTop: 42 },
  iconWrap: { alignItems: 'center', backgroundColor: colors.raised, borderRadius: 28, height: 56, justifyContent: 'center', marginBottom: 22, width: 56 },
  eyebrow: { ...typeScale.label, color: colors.accent, letterSpacing: 1.3 },
  title: { ...typeScale.title, color: colors.text, fontSize: 36, lineHeight: 42, marginTop: 9 },
  subtitle: { ...typeScale.secondary, color: colors.mutedText, fontSize: 15, lineHeight: 23, marginTop: 12, maxWidth: 350 },
  setupCard: { alignItems: 'flex-start', backgroundColor: colors.warningSurface, borderColor: colors.border, borderRadius: radii.surface, borderWidth: 1, flexDirection: 'row', gap: spacing.md, marginTop: 24, padding: spacing.lg },
  setupCopy: { flex: 1 },
  setupTitle: { ...typeScale.secondary, color: colors.accent, fontWeight: '700' },
  setupBody: { ...typeScale.label, color: colors.mutedText, lineHeight: 18, marginTop: 3 },
  form: { marginTop: 28 },
  footer: { backgroundColor: colors.canvas, paddingHorizontal: 24, paddingTop: spacing.sm, paddingBottom: spacing.md },
  iosKeyboardFooter: { flexDirection: 'row', gap: spacing.sm, left: 0, position: 'absolute', right: 0 },
  primaryButton: { minHeight: 54 },
  iosPrimaryButton: { flex: 1 },
  keyboardDismissButton: { alignItems: 'center', backgroundColor: colors.raised, borderRadius: radii.pill, borderColor: colors.border, borderWidth: 1, justifyContent: 'center', minHeight: 54, paddingHorizontal: 17 },
  doneKeyboardText: { color: colors.text, fontSize: 13, fontWeight: '700' },
  emailLink: { alignItems: 'center', backgroundColor: colors.canvas, paddingBottom: spacing.lg, paddingTop: spacing.xs },
  emailLinkText: { ...typeScale.label, color: colors.accent, fontWeight: '700' },
  });
}
