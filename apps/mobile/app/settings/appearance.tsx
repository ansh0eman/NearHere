import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/providers/theme-provider';
import { radii, spacing, typeScale } from '@/constants/design-tokens';
import type { ThemePreference } from '@/lib/theme';

const options: { value: ThemePreference; title: string; detail: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'system', title: 'System', detail: 'Follow your device appearance', icon: 'phone-portrait-outline' },
  { value: 'light', title: 'Daylight', detail: 'A calm, sunlit neighborhood map', icon: 'sunny-outline' },
  { value: 'dark', title: 'Night Arcade', detail: 'NearHere’s charcoal night palette', icon: 'moon-outline' },
];

export default function AppearanceScreen() {
  const router = useRouter();
  const { colors, preference, setPreference } = useTheme();
  const styles = makeStyles(colors);

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={styles.back}>
            <Ionicons name="arrow-back" size={21} color={colors.text} />
          </Pressable>
          <Text style={styles.title}>Appearance</Text>
          <View style={styles.spacer} />
        </View>
        <Text style={styles.intro}>Choose how NearHere looks on your device.</Text>
        <View style={styles.preview}>
          <View style={styles.previewMap}>
            <View style={[styles.park, { top: 16, left: 18 }]} />
            <View style={[styles.park, { bottom: 12, right: 22 }]} />
            <View style={styles.road} />
            <View style={styles.sprite}><Ionicons name="people" size={18} color={colors.onAccent} /></View>
          </View>
          <Text style={styles.previewLabel}>{preference === 'light' ? 'DAYLIGHT PLAYGROUND' : preference === 'dark' ? 'NIGHT ARCADE' : 'YOUR MAP THE WAY YOU LIKE IT'}</Text>
        </View>
        <View accessibilityRole="radiogroup" style={styles.options}>
          {options.map((option) => {
            const selected = preference === option.value;
            return (
              <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={() => setPreference(option.value)} style={[styles.option, selected && styles.optionSelected]}>
                <View style={styles.optionIcon}><Ionicons name={option.icon} size={21} color={selected ? colors.accentText : colors.mutedText} /></View>
                <View style={styles.optionCopy}><Text style={styles.optionTitle}>{option.title}</Text><Text style={styles.optionDetail}>{option.detail}</Text></View>
                {selected && <Ionicons name="checkmark-circle" size={22} color={colors.accentText} />}
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.note}>Your choice is saved on this device. The map keeps the same places and changes its cartography.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    screen: { backgroundColor: c.canvas, flex: 1 },
    content: { padding: spacing.xl, gap: spacing.lg },
    header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 48 },
    back: { alignItems: 'center', backgroundColor: c.surface, borderColor: c.border, borderRadius: 24, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 },
    title: { ...typeScale.section, color: c.text },
    spacer: { width: 44 },
    intro: { ...typeScale.body, color: c.mutedText, marginTop: spacing.sm },
    preview: { backgroundColor: c.surface, borderColor: c.border, borderRadius: radii.surface, borderWidth: 1, overflow: 'hidden', paddingBottom: spacing.md },
    previewMap: { backgroundColor: c.canvas, height: 175, overflow: 'hidden', position: 'relative' },
    park: { backgroundColor: c.park, borderRadius: 28, height: 55, position: 'absolute', width: 84 },
    road: { backgroundColor: c.surface, height: 15, left: -20, position: 'absolute', right: -20, top: 83, transform: [{ rotate: '-12deg' }] },
    sprite: { alignItems: 'center', backgroundColor: c.accent, borderColor: c.surface, borderRadius: 24, borderWidth: 3, height: 44, justifyContent: 'center', left: '47%', position: 'absolute', top: 64, width: 44 },
    previewLabel: { color: c.mutedText, fontSize: 10, fontWeight: '800', letterSpacing: 1.4, marginHorizontal: spacing.lg, marginTop: spacing.md },
    options: { gap: spacing.sm, marginTop: spacing.sm },
    option: { alignItems: 'center', backgroundColor: c.surface, borderColor: c.border, borderRadius: radii.surface, borderWidth: 1, flexDirection: 'row', gap: spacing.md, minHeight: 76, padding: spacing.md },
    optionSelected: { borderColor: c.accentText, borderWidth: 2 },
    optionIcon: { alignItems: 'center', backgroundColor: c.raised, borderRadius: 18, height: 38, justifyContent: 'center', width: 38 },
    optionCopy: { flex: 1, gap: 3 },
    optionTitle: { color: c.text, fontSize: 16, fontWeight: '700' },
    optionDetail: { color: c.mutedText, fontSize: 13, lineHeight: 18 },
    note: { color: c.subtleText, fontSize: 12, lineHeight: 18, marginTop: spacing.sm },
  });
}
