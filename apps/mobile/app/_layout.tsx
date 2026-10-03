import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { ProfileProvider } from '@/providers/profile-provider';
import { ThemeProvider, useTheme } from '@/providers/theme-provider';
import { radii, spacing, typeScale } from '@/constants/design-tokens';

export const unstable_settings = {
  anchor: '(tabs)',
};

function AppNavigator() {
  const { colors, mode, ready: themeReady } = useTheme();
  const { retrySessionRestore, restoreErrorMessage, status } = useAuth();
  const styles = makeStyles(colors);

  if (!themeReady || status === 'restoring') {
    return (
      <View style={styles.gate}>
        <View style={styles.gateMark}>
          <Text style={styles.gateEmoji}>📍</Text>
        </View>
        <ActivityIndicator color={colors.accent} size="small" />
        <Text style={styles.gateText}>Restoring your NearHere session…</Text>
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      </View>
    );
  }

  if (status === 'restoreError') {
    return (
      <View style={styles.gate}>
        <Text style={styles.gateTitle}>We couldn&apos;t restore your session</Text>
        <Text style={styles.gateText}>{restoreErrorMessage}</Text>
        <Pressable accessibilityRole="button" onPress={retrySessionRestore} style={styles.retryButton}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      </View>
    );
  }

  return (
    <ProfileProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="settings/appearance" options={{ animation: 'slide_from_right', headerShown: false }} />
        <Stack.Screen name="settings/username" options={{ animation: 'slide_from_right', headerShown: false }} />
        <Stack.Screen name="avatar-studio" options={{ animation: 'slide_from_bottom', headerShown: false, presentation: 'modal' }} />
        <Stack.Screen
          name="location-picker"
          options={{ animation: 'slide_from_bottom', headerShown: false, presentation: 'modal' }}
        />
        <Stack.Screen
          name="auth"
          options={{
            animation: 'slide_from_bottom',
            gestureEnabled: false,
            headerShown: false,
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="onboarding"
          options={{ animation: 'slide_from_bottom', headerShown: false, presentation: 'modal' }}
        />
        <Stack.Screen
          name="host"
          options={{ animation: 'slide_from_bottom', headerShown: false, presentation: 'modal' }}
        />
        <Stack.Screen
          name="activity"
          options={{ animation: 'slide_from_right', headerShown: false }}
        />
        <Stack.Screen
          name="operator"
          options={{ animation: 'slide_from_right', headerShown: false }}
        />
      </Stack>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
    </ProfileProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}

function makeStyles(c: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
  gate: { alignItems: 'center', backgroundColor: c.canvas, flex: 1, justifyContent: 'center', paddingHorizontal: 30 },
  gateEmoji: { fontSize: 31 },
  gateMark: { alignItems: 'center', backgroundColor: c.raised, borderRadius: 28, height: 56, justifyContent: 'center', marginBottom: 24, width: 56 },
  gateText: { ...typeScale.secondary, color: c.mutedText, marginTop: spacing.md, maxWidth: 300, textAlign: 'center' },
  gateTitle: { ...typeScale.section, color: c.text, textAlign: 'center' },
  retryButton: { backgroundColor: c.accent, borderRadius: radii.pill, marginTop: spacing.xl, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  retryText: { color: c.onAccent, fontSize: 14, fontWeight: '700' },
  });
}
