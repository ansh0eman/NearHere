import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { AuthProvider } from '@/providers/auth-provider';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <AuthProvider>
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
      </Stack>
      <StatusBar style="dark" />
    </AuthProvider>
  );
}
