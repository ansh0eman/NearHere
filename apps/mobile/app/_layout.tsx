import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { ProfileProvider } from '@/providers/profile-provider';
import { colors, radii, spacing, typeScale } from '@/constants/design-tokens';

export const unstable_settings = {
  anchor: '(tabs)',
};

function AppNavigator() {
  const { retrySessionRestore, restoreErrorMessage, status } = useAuth();

  if (status === 'restoring') {
    return (
      <View style={styles.gate}>
        <View style={styles.gateMark}>
          <Text style={styles.gateEmoji}>📍</Text>
        </View>
        <ActivityIndicator color={colors.accent} size="small" />
        <Text style={styles.gateText}>Restoring your NearHere session…</Text>
        <StatusBar style="light" />
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
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <ProfileProvider>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
      <StatusBar style="light" />
    </ProfileProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  gate: { alignItems: 'center', backgroundColor: colors.canvas, flex: 1, justifyContent: 'center', paddingHorizontal: 30 },
  gateEmoji: { fontSize: 31 },
  gateMark: { alignItems: 'center', backgroundColor: colors.raised, borderRadius: 28, height: 56, justifyContent: 'center', marginBottom: 24, width: 56 },
  gateText: { ...typeScale.secondary, color: colors.mutedText, marginTop: spacing.md, maxWidth: 300, textAlign: 'center' },
  gateTitle: { ...typeScale.section, color: colors.text, textAlign: 'center' },
  retryButton: { backgroundColor: colors.accent, borderRadius: radii.pill, marginTop: spacing.xl, paddingHorizontal: spacing.xl, paddingVertical: spacing.md },
  retryText: { color: colors.onAccent, fontSize: 14, fontWeight: '700' },
});
