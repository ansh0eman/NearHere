import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PlansScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>YOUR ACTIVITIES</Text>
        <Text style={styles.title}>Plans</Text>
        <Text style={styles.subtitle}>The things you join or host will live here.</Text>
      </View>

      <View style={styles.emptyState}>
        <View style={styles.emptyIcon}>
          <Ionicons name="calendar-outline" size={29} color="#FF6B4A" />
        </View>
        <Text style={styles.emptyTitle}>Your next plan starts nearby</Text>
        <Text style={styles.emptyBody}>Join an activity from the map, or create one when inspiration strikes.</Text>
        <Pressable accessibilityRole="button" onPress={() => router.push('/')} style={styles.button}>
          <Text style={styles.buttonText}>Explore nearby</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#F7F4EE', flex: 1, paddingHorizontal: 22 },
  header: { paddingTop: 24 },
  eyebrow: { color: '#66717D', fontSize: 10, fontWeight: '900', letterSpacing: 1.4 },
  title: { color: '#16202A', fontSize: 42, fontWeight: '900', letterSpacing: -1.8, marginTop: 8 },
  subtitle: { color: '#66717D', fontSize: 15, lineHeight: 22, marginTop: 7 },
  emptyState: { alignItems: 'center', flex: 1, justifyContent: 'center', paddingHorizontal: 22, paddingBottom: 90 },
  emptyIcon: { alignItems: 'center', backgroundColor: '#FFE7DE', borderRadius: 28, height: 56, justifyContent: 'center', width: 56 },
  emptyTitle: { color: '#16202A', fontSize: 22, fontWeight: '900', letterSpacing: -0.6, marginTop: 20, textAlign: 'center' },
  emptyBody: { color: '#66717D', fontSize: 14, lineHeight: 21, marginTop: 8, maxWidth: 290, textAlign: 'center' },
  button: { backgroundColor: '#16202A', borderRadius: 999, marginTop: 22, paddingHorizontal: 19, paddingVertical: 13 },
  buttonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
});
