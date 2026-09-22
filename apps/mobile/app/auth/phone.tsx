import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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

import { isValidE164PhoneNumber, normalizePhoneNumber } from '@/lib/phone-number';
import { useAuth } from '@/providers/auth-provider';

export default function PhoneScreen() {
  const router = useRouter();
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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.content}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
        <Pressable
          accessibilityLabel="Close phone sign in"
          accessibilityRole="button"
          onPress={cancelSignIn}
          style={styles.closeButton}>
          <Ionicons name="close" size={23} color="#16202A" />
        </Pressable>

        <View style={styles.hero}>
          <View style={styles.iconWrap}>
            <Ionicons name="phone-portrait-outline" size={29} color="#FF6B4A" />
          </View>
          <Text style={styles.eyebrow}>YOUR NEARHERE ACCOUNT</Text>
          <Text style={styles.title}>Continue with your phone</Text>
          <Text style={styles.subtitle}>
            We will send a one-time code. Your account is required to join or host, but not to browse.
          </Text>
        </View>

        {!isConfigured && (
          <View style={styles.setupCard}>
            <Ionicons name="construct-outline" size={20} color="#A45B20" />
            <View style={styles.setupCopy}>
              <Text style={styles.setupTitle}>Backend setup required</Text>
              <Text style={styles.setupBody}>
                This screen is real, but SMS remains disabled until Supabase and an SMS provider are configured.
              </Text>
            </View>
          </View>
        )}

        <View style={styles.form}>
          <Text style={styles.label}>PHONE NUMBER</Text>
          <TextInput
            accessibilityLabel="Phone number"
            autoComplete="tel"
            autoFocus
            keyboardType="phone-pad"
            onChangeText={setPhone}
            placeholder="+91 98765 43210"
            placeholderTextColor="#9AA1A8"
            style={styles.input}
            value={phone}
          />
          <Text style={styles.helper}>Include the country code. We normalize it to E.164 format before sending.</Text>
          {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}
        </View>

        <Pressable
          accessibilityRole="button"
          disabled={isSending}
          onPress={() => void sendCode()}
          style={[styles.primaryButton, isSending && styles.primaryButtonDisabled]}>
          {isSending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.primaryText}>Send one-time code</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </>
          )}
        </Pressable>
        </ScrollView>
        {keyboardHeight > 0 ? <Pressable accessibilityLabel="Dismiss keyboard" accessibilityRole="button" onPress={Keyboard.dismiss} style={[styles.keyboardDismissButton, { bottom: keyboardHeight + 10 }]}><Text style={styles.doneKeyboardText}>Done</Text></Pressable> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#F7F4EE', flex: 1 },
  content: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24 },
  closeButton: { alignItems: 'center', borderColor: 'rgba(22,32,42,0.12)', borderRadius: 22, borderWidth: 1, height: 44, justifyContent: 'center', marginTop: 8, width: 44 },
  hero: { marginTop: 42 },
  iconWrap: { alignItems: 'center', backgroundColor: '#FFE7DE', borderRadius: 28, height: 56, justifyContent: 'center', marginBottom: 22, width: 56 },
  eyebrow: { color: '#FF6B4A', fontSize: 10, fontWeight: '900', letterSpacing: 1.3 },
  title: { color: '#16202A', fontSize: 38, fontWeight: '900', letterSpacing: -1.7, lineHeight: 41, marginTop: 9 },
  subtitle: { color: '#66717D', fontSize: 15, lineHeight: 22, marginTop: 12, maxWidth: 350 },
  setupCard: { alignItems: 'flex-start', backgroundColor: '#FFF3D9', borderColor: '#ECD5AA', borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: 10, marginTop: 24, padding: 14 },
  setupCopy: { flex: 1 },
  setupTitle: { color: '#754013', fontSize: 13, fontWeight: '900' },
  setupBody: { color: '#8A613D', fontSize: 12, lineHeight: 17, marginTop: 3 },
  form: { marginTop: 28 },
  label: { color: '#66717D', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  input: { borderBottomColor: '#16202A', borderBottomWidth: 2, color: '#16202A', fontSize: 26, fontWeight: '800', letterSpacing: 0.5, paddingHorizontal: 0, paddingVertical: 13 },
  helper: { color: '#7A838D', fontSize: 11, lineHeight: 16, marginTop: 9 },
  error: { color: '#B63B2B', fontSize: 12, fontWeight: '700', lineHeight: 17, marginTop: 10 },
  primaryButton: { alignItems: 'center', backgroundColor: '#16202A', borderRadius: 999, flexDirection: 'row', gap: 9, justifyContent: 'center', marginBottom: 18, marginTop: 'auto', minHeight: 54, paddingHorizontal: 20 },
  primaryButtonDisabled: { opacity: 0.65 },
  primaryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  keyboardDismissButton: { alignItems: 'center', backgroundColor: '#16202A', borderRadius: 999, elevation: 5, paddingHorizontal: 17, paddingVertical: 10, position: 'absolute', right: 24, shadowColor: '#16202A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
  doneKeyboardText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
});
