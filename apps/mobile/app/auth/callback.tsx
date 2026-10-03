import * as Linking from 'expo-linking';
import { type Href, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { radii, spacing, typeScale } from '@/constants/design-tokens';
import { useAuth } from '@/providers/auth-provider';
import { useTheme } from '@/providers/theme-provider';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { completeEmailLink } = useAuth();
  const initialUrl = Linking.useURL();
  const handled = useRef(false);
  const [message, setMessage] = useState('Completing your secure sign-in…');

  useEffect(() => {
    if (handled.current || !initialUrl) return;
    handled.current = true;
    void completeEmailLink(initialUrl).then((result) => {
      if (result.ok) {
        router.dismissAll();
        router.replace('/onboarding/profile');
      } else {
        setMessage(result.message);
      }
    });
  }, [completeEmailLink, initialUrl, router]);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <ActivityIndicator color={colors.accent} size="small" />
        <Text style={styles.title}>Email sign-in</Text>
        <Text style={styles.body}>{message}</Text>
        {message !== 'Completing your secure sign-in…' ? <Pressable accessibilityRole="button" onPress={() => router.replace('/auth/email' as Href)} style={styles.button}><Text style={styles.buttonText}>Request another link</Text></Pressable> : null}
      </View>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    screen: { backgroundColor: colors.canvas, flex: 1 }, content: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingHorizontal: 32 },
    title: { ...typeScale.title, color: colors.text, marginTop: spacing.lg, textAlign: 'center' }, body: { ...typeScale.secondary, color: colors.mutedText, lineHeight: 22, marginTop: spacing.sm, textAlign: 'center' },
    button: { backgroundColor: colors.accent, borderRadius: radii.pill, marginTop: spacing.xl, paddingHorizontal: spacing.xl, paddingVertical: spacing.md }, buttonText: { color: colors.onAccent, fontWeight: '700' },
  });
}
