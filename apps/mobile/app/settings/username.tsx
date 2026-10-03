import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { radii, spacing, typeScale } from '@/constants/design-tokens';
import { validateUsername } from '@/lib/profile-validation';
import { useProfile } from '@/providers/profile-provider';
import { useTheme } from '@/providers/theme-provider';

/** Username is a one-time public label, never an authentication or permission key. */
export default function UsernameScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { state, claimUsername } = useProfile();
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  if (!state.profile) return <SafeAreaView style={styles.center}><ActivityIndicator color={colors.accent} /></SafeAreaView>;
  const profile = state.profile;
  const busy = state.status === 'saving';
  const claimed = profile.username !== null;
  const submit = async () => {
    const validation = validateUsername(username);
    if (!validation.ok) { setMessage(validation.message); return; }
    setMessage(null);
    const result = await claimUsername(validation.value);
    if (!result.ok) { setMessage(result.message); return; }
    router.back();
  };
  return <SafeAreaView style={styles.screen}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
    <View style={styles.content}>
      <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={styles.back}><Ionicons color={colors.text} name="arrow-back" size={21} /></Pressable><Text style={styles.headerTitle}>Username</Text><View style={styles.back} /></View>
      <View style={styles.badge}><Ionicons color={colors.onAccent} name="at" size={22} /></View>
      <Text style={styles.title}>{claimed ? `@${profile.username}` : 'Claim your username'}</Text>
      <Text style={styles.copy}>{claimed ? 'Your username is set and stays attached to this account.' : 'This optional name is public with your activities. It is not your login and cannot be changed after claiming.'}</Text>
      {!claimed && <><Text style={styles.label}>USERNAME</Text><TextInput accessibilityLabel="Username" autoCapitalize="none" autoCorrect={false} editable={!busy} maxLength={20} onChangeText={(value) => { setUsername(value); setMessage(null); }} onSubmitEditing={() => void submit()} placeholder="neighborhood_name" placeholderTextColor={colors.subtleText} returnKeyType="done" style={styles.input} value={username} />
        <Text style={styles.helper}>3–20 lowercase letters, numbers, or underscores. Starts with a letter.</Text>
        {message && <Text accessibilityRole="alert" style={styles.error}>{message}</Text>}
        <Button disabled={busy} label={busy ? 'Claiming username' : 'Claim username'} loading={busy} onPress={() => void submit()} style={styles.action} />
      </>}
    </View>
  </KeyboardAvoidingView></SafeAreaView>;
}

function makeStyles(c: ReturnType<typeof useTheme>['colors']) { return StyleSheet.create({
  screen: { backgroundColor: c.canvas, flex: 1 }, keyboard: { flex: 1 }, center: { alignItems: 'center', backgroundColor: c.canvas, flex: 1, justifyContent: 'center' }, content: { flex: 1, padding: spacing.lg },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 48 }, headerTitle: { color: c.text, fontSize: 17, fontWeight: '800' }, back: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 }, badge: { alignItems: 'center', backgroundColor: c.accent, borderRadius: 28, height: 56, justifyContent: 'center', marginTop: spacing.xxl, width: 56 },
  title: { ...typeScale.title, color: c.text, marginTop: spacing.xl }, copy: { ...typeScale.secondary, color: c.mutedText, lineHeight: 22, marginTop: spacing.sm }, label: { color: c.mutedText, fontSize: 11, fontWeight: '800', letterSpacing: 1.1, marginTop: spacing.xxl }, input: { backgroundColor: c.raised, borderColor: c.border, borderRadius: radii.control, borderWidth: 1, color: c.text, fontSize: 17, marginTop: spacing.sm, minHeight: 54, paddingHorizontal: spacing.md }, helper: { color: c.subtleText, fontSize: 12, lineHeight: 18, marginTop: spacing.sm }, error: { color: c.danger, fontSize: 13, fontWeight: '700', lineHeight: 19, marginTop: spacing.lg }, action: { marginTop: spacing.xl },
}); }
