import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { ProfileProvider } from '@/providers/profile-provider';

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
        <ActivityIndicator color="#FF6B4A" size="small" />
        <Text style={styles.gateText}>Restoring your NearHere session…</Text>
        <StatusBar style="dark" />
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
        <StatusBar style="dark" />
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
          options={{ animation: 'slide_from_bottom', headerShown: false, presentation: 'modal' }}
        />
        <Stack.Screen
          name="onboarding"
          options={{ animation: 'slide_from_bottom', headerShown: false, presentation: 'modal' }}
        />
      </Stack>
      <StatusBar style="dark" />
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
  gate: { alignItems: 'center', backgroundColor: '#F7F4EE', flex: 1, justifyContent: 'center', paddingHorizontal: 30 },
  gateEmoji: { fontSize: 31 },
  gateMark: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 28, height: 56, justifyContent: 'center', marginBottom: 24, width: 56 },
  gateText: { color: '#66717D', fontSize: 14, lineHeight: 21, marginTop: 12, maxWidth: 300, textAlign: 'center' },
  gateTitle: { color: '#16202A', fontSize: 25, fontWeight: '900', letterSpacing: -0.8, textAlign: 'center' },
  retryButton: { backgroundColor: '#16202A', borderRadius: 999, marginTop: 24, paddingHorizontal: 24, paddingVertical: 14 },
  retryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
});
