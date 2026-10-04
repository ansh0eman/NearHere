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
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { radii, spacing, typeScale } from '@/constants/design-tokens';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EmailScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const scrollRef = useRef<ScrollView>(null);
  const { pendingEmail, requestEmailMagicLink, status } = useAuth();
  const [email, setEmail] = useState(pendingEmail ?? '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const isSending = status === 'sendingEmailLink';
  // Require a destination as well as the shared status, so a stale auth state
  // can never render an empty "check inbox" success card.
  const linkSent = status === 'awaitingEmailLink' && pendingEmail !== null;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, (event) => setKeyboardHeight(event.endCoordinates.height));
    const hideSubscription = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => { showSubscription.remove(); hideSubscription.remove(); };
  }, []);

  async function sendLink() {
    const normalizedEmail = email.trim().toLowerCase();
    setErrorMessage(null);
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setErrorMessage('Enter a valid email address.');
      return;
    }
    const result = await requestEmailMagicLink(normalizedEmail);
    if (!result.ok) setErrorMessage(result.message);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'android' ? 'height' : undefined} style={styles.content}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Back to phone sign in" accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
        </View>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[styles.scrollContent, keyboardHeight > 0 && { paddingBottom: keyboardHeight + 100 }]}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.scrollView}>
          <View style={styles.iconWrap}><Ionicons name="mail-outline" size={29} color={colors.accent} /></View>
          <Text style={styles.eyebrow}>YOUR NEARHERE ACCOUNT</Text>
          <Text style={styles.title}>Continue with email</Text>
          <Text style={styles.subtitle}>We will email a secure sign-in link. Tap it to return to NearHere.</Text>
          {linkSent ? (
            <View style={styles.successCard}>
              <Ionicons name="checkmark-circle-outline" size={22} color={colors.success} />
              <View style={styles.successCopy}>
                <Text style={styles.successTitle}>Check your inbox</Text>
                <Text style={styles.successBody}>We sent a sign-in link to {pendingEmail}. Open it on this iPhone Simulator.</Text>
              </View>
            </View>
          ) : null}
          <View style={styles.form}>
            <Field
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              keyboardType="email-address"
              label="Email address"
              onChangeText={setEmail}
              placeholder="you@example.com"
              textContentType="emailAddress"
              value={email}
              error={errorMessage}
            />
          </View>
        </ScrollView>
        <View style={[styles.footer, Platform.OS === 'ios' && keyboardHeight > 0 && styles.iosKeyboardFooter, Platform.OS === 'ios' && keyboardHeight > 0 && { bottom: keyboardHeight + spacing.sm }]}>
          <Button label={linkSent ? 'Send another link' : 'Email me a sign-in link'} icon="arrow-forward" loading={isSending} onPress={() => void sendLink()} style={[styles.primaryButton, Platform.OS === 'ios' && keyboardHeight > 0 && styles.iosPrimaryButton]} />
          {keyboardHeight > 0 ? <Pressable accessibilityLabel="Dismiss keyboard" accessibilityRole="button" onPress={Keyboard.dismiss} style={styles.keyboardDismissButton}><Text style={styles.doneKeyboardText}>Done</Text></Pressable> : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    screen: { backgroundColor: colors.canvas, flex: 1 }, content: { flex: 1 },
    header: { height: 60, justifyContent: 'center', paddingHorizontal: 24 }, scrollView: { flex: 1 }, scrollContent: { flexGrow: 1, paddingBottom: spacing.md, paddingHorizontal: 24 },
    backButton: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.pill, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 },
    iconWrap: { alignItems: 'center', backgroundColor: colors.raised, borderRadius: 28, height: 56, justifyContent: 'center', marginBottom: 22, marginTop: 42, width: 56 },
    eyebrow: { ...typeScale.label, color: colors.accent, letterSpacing: 1.3 }, title: { ...typeScale.title, color: colors.text, fontSize: 36, lineHeight: 42, marginTop: 9 }, subtitle: { ...typeScale.secondary, color: colors.mutedText, fontSize: 15, lineHeight: 23, marginTop: 12, maxWidth: 350 },
    form: { marginTop: 28 }, footer: { backgroundColor: colors.canvas, paddingBottom: spacing.md, paddingHorizontal: 24, paddingTop: spacing.sm }, iosKeyboardFooter: { flexDirection: 'row', gap: spacing.sm, left: 0, position: 'absolute', right: 0 }, primaryButton: { minHeight: 54 }, iosPrimaryButton: { flex: 1 },
    keyboardDismissButton: { alignItems: 'center', backgroundColor: colors.raised, borderColor: colors.border, borderRadius: radii.pill, borderWidth: 1, justifyContent: 'center', minHeight: 54, paddingHorizontal: 17 }, doneKeyboardText: { color: colors.text, fontSize: 13, fontWeight: '700' },
    successCard: { alignItems: 'flex-start', backgroundColor: colors.successSurface, borderColor: colors.border, borderRadius: radii.surface, borderWidth: 1, flexDirection: 'row', gap: spacing.md, marginTop: 24, padding: spacing.lg }, successCopy: { flex: 1 }, successTitle: { ...typeScale.secondary, color: colors.text, fontWeight: '700' }, successBody: { ...typeScale.label, color: colors.mutedText, lineHeight: 18, marginTop: 3 },
  });
}
