import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { HostAvatar } from '@/components/host-avatar';
import { Button } from '@/components/ui/button';
import { radii, spacing, typeScale } from '@/constants/design-tokens';
import { avatarChoice, avatarSeed } from '@/lib/avatar-identity';
import type { UserProfile } from '@/types/profile';
import { useTheme } from '@/providers/theme-provider';

/** Real owner data only. Narrow windows and Dynamic Type stack, not shrink text. */
export function ProfileHero({ profile, onEdit, onAvatarStudio }: { profile: UserProfile; onEdit: () => void; onAvatarStudio?: () => void }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { width, fontScale } = useWindowDimensions();
  const stacked = width < 390 || fontScale > 1.15;
  return <View style={styles.section}>
    <Text accessibilityRole="header" style={styles.heading}>Your profile</Text>
    <View style={[styles.hero, stacked && styles.stacked]}>
      <View style={styles.identity}>
        <Text accessibilityRole="header" style={styles.name}>{profile.displayName}</Text>
        {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}
        {profile.cityLabel && <Text style={styles.city}>{profile.cityLabel}</Text>}
      </View>
      <View style={styles.character}>
        <HostAvatar seed={avatarSeed(profile.avatarConfig, profile.id)} avatarId={avatarChoice(profile.avatarConfig, profile.id)} size={248} />
      </View>
    </View>
    {profile.interests.length > 0 && <View style={styles.interests}>
      {profile.interests.map(interest => <View key={interest} style={styles.interest}><Text style={styles.interestText}>{interest}</Text></View>)}
    </View>}
    <Button label="Edit profile & character" variant="secondary" onPress={onEdit} />
    {onAvatarStudio && <Button label="Open Avatar Studio" variant="quiet" onPress={onAvatarStudio} />}
    <Text style={styles.privacy}>Only you can see your bio, city and interests. Your name and character appear on your activities.</Text>
  </View>;
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
  section: { alignSelf: 'stretch' },
  heading: { ...typeScale.section, color: colors.text, marginBottom: spacing.lg },
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg },
  stacked: { flexDirection: 'column-reverse', alignItems: 'stretch' },
  identity: { flex: 1, minWidth: 0 },
  name: { fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.7, color: colors.text },
  bio: { ...typeScale.body, color: colors.mutedText, marginTop: spacing.md },
  city: { ...typeScale.secondary, color: colors.mutedText, marginTop: spacing.md },
  character: { alignItems: 'center', flexShrink: 0 },
  interests: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  interest: { backgroundColor: colors.surface, borderRadius: radii.control, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  interestText: { ...typeScale.secondary, textTransform: 'capitalize', color: colors.text },
  privacy: { ...typeScale.secondary, color: colors.mutedText, marginTop: spacing.md },
  });
}
