import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HostAvatar } from '@/components/host-avatar';
import { Button } from '@/components/ui/button';
import { radii, spacing, typeScale } from '@/constants/design-tokens';
import { KENNEY_APPEARANCE_CATALOG } from '@/lib/avatar-catalog';
import { avatarChoice, avatarSeed } from '@/lib/avatar-identity';
import { useProfile } from '@/providers/profile-provider';
import { useTheme } from '@/providers/theme-provider';
import type { KenneyAppearanceId } from '../../../packages/contracts/avatar';

/** A bounded first Studio: every visible choice is a real bundled, supported look. */
export default function AvatarStudioScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { state, refresh, saveAvatarLook } = useProfile();
  const profile = state.profile;
  const savedChoice = useMemo(() => profile ? avatarChoice(profile.avatarConfig, profile.id) : null, [profile]);
  const initialChoice = KENNEY_APPEARANCE_CATALOG.some((look) => look.id === savedChoice)
    ? savedChoice as KenneyAppearanceId : KENNEY_APPEARANCE_CATALOG[0].id;
  const [draft, setDraft] = useState<KenneyAppearanceId>(initialChoice);
  const [error, setError] = useState<string | null>(null);
  const saving = useRef(false);
  useEffect(() => { setDraft(initialChoice); }, [initialChoice]);

  if (!profile) {
    return <SafeAreaView style={styles.center}><ActivityIndicator color={colors.accent} /><Text style={styles.helper}>Loading your character…</Text></SafeAreaView>;
  }
  const busy = state.status === 'saving';
  const randomize = () => {
    setDraft(KENNEY_APPEARANCE_CATALOG[Math.floor(Math.random() * KENNEY_APPEARANCE_CATALOG.length)].id);
    setError(null);
  };
  const save = async () => {
    if (saving.current || busy) return;
    saving.current = true;
    setError(null);
    const result = await saveAvatarLook(draft).finally(() => { saving.current = false; });
    if (!result.ok) { setError(result.message); return; }
    router.back();
  };

  return <SafeAreaView style={styles.screen}><ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Cancel Avatar Studio" disabled={busy} onPress={() => router.back()} style={styles.iconButton}><Ionicons color={colors.text} name="close" size={23} /></Pressable>
      <Text style={styles.headerTitle}>Avatar Studio</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Randomize character" disabled={busy} onPress={randomize} style={styles.iconButton}><Ionicons color={colors.text} name="shuffle-outline" size={21} /></Pressable>
    </View>
    <View style={styles.stage}><View style={styles.gridLineOne} /><View style={styles.gridLineTwo} /><HostAvatar seed={avatarSeed(profile.avatarConfig, profile.id)} avatarId={draft} size={286} /></View>
    <Text style={styles.title}>Pick a neighborhood look</Text>
    <Text style={styles.copy}>Your character appears with activities you host. It marks an approximate activity area, never your live location.</Text>
    <Text style={styles.label}>STARTER LOOKS</Text>
    <View accessibilityRole="radiogroup" style={styles.grid}>{KENNEY_APPEARANCE_CATALOG.map((look, index) => {
      const selected = draft === look.id;
      return <Pressable key={look.id} accessibilityRole="radio" accessibilityState={{ checked: selected }} accessibilityLabel={`Look ${index + 1}`} disabled={busy} onPress={() => { setDraft(look.id); setError(null); }} style={[styles.option, selected && styles.optionSelected]}>
        <HostAvatar seed={look.id} avatarId={look.id} size={122} /><Text style={styles.optionText}>Look {index + 1}</Text>
        {selected && <Ionicons color={colors.accent} name="checkmark-circle" size={21} style={styles.check} />}
      </Pressable>;
    })}</View>
    {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    {state.status === 'error' && <Button label="Reload profile" variant="secondary" onPress={() => void refresh()} style={styles.reload} />}
    <Button label={busy ? 'Saving look' : 'Save look'} loading={busy} disabled={busy} onPress={() => void save()} style={styles.save} />
    <Text style={styles.footnote}>More individual controls arrive only after their art and save rules are proven. These looks work offline and do not use a photo or AI likeness.</Text>
  </ScrollView></SafeAreaView>;
}

function makeStyles(c: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    center: { alignItems: 'center', backgroundColor: c.canvas, flex: 1, justifyContent: 'center', padding: spacing.xl }, helper: { ...typeScale.secondary, color: c.mutedText, marginTop: spacing.md }, screen: { backgroundColor: c.canvas, flex: 1 }, content: { padding: spacing.lg, paddingBottom: spacing.xxl },
    header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 48 }, headerTitle: { color: c.text, fontSize: 17, fontWeight: '800' }, iconButton: { alignItems: 'center', backgroundColor: c.surface, borderColor: c.border, borderRadius: 22, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 },
    stage: { alignItems: 'center', backgroundColor: c.surface, borderColor: c.border, borderRadius: radii.surface, borderWidth: 1, height: 318, justifyContent: 'flex-end', marginTop: spacing.lg, overflow: 'hidden', position: 'relative' }, gridLineOne: { backgroundColor: c.raised, height: 1, left: 0, position: 'absolute', right: 0, top: '34%' }, gridLineTwo: { backgroundColor: c.raised, height: 1, left: 0, position: 'absolute', right: 0, top: '68%' },
    title: { ...typeScale.title, color: c.text, marginTop: spacing.xl }, copy: { ...typeScale.secondary, color: c.mutedText, lineHeight: 22, marginTop: spacing.sm }, label: { color: c.mutedText, fontSize: 11, fontWeight: '800', letterSpacing: 1.1, marginTop: spacing.xl }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
    option: { alignItems: 'center', backgroundColor: c.surface, borderColor: c.border, borderRadius: radii.surface, borderWidth: 1, flexBasis: '48%', height: 165, justifyContent: 'center', overflow: 'hidden', position: 'relative' }, optionSelected: { backgroundColor: c.raised, borderColor: c.accent, borderWidth: 2 }, optionText: { color: c.mutedText, fontSize: 12, fontWeight: '700', marginTop: -4 }, check: { position: 'absolute', right: 8, top: 8 }, error: { color: c.danger, fontSize: 13, fontWeight: '700', lineHeight: 19, marginTop: spacing.lg }, reload: { marginTop: spacing.md }, save: { marginTop: spacing.xl }, footnote: { color: c.subtleText, fontSize: 11, lineHeight: 17, marginHorizontal: spacing.md, marginTop: spacing.lg, textAlign: 'center' },
  });
}
