import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, { Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DEFAULT_MAP_REGION } from '@/hooks/use-nearby-location';
import { saveManualLocation } from '@/lib/location-storage';
import { searchPlaces } from '@/lib/place-search';
import { PlaceSearchResult } from '@/types/place-search';

function parseCoordinate(value: string | string[] | undefined, fallback: number) {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function LocationPickerScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const params = useLocalSearchParams<{ latitude?: string; longitude?: string }>();
  const initialRegion = useMemo<Region>(
    () => ({
      ...DEFAULT_MAP_REGION,
      latitude: parseCoordinate(params.latitude, DEFAULT_MAP_REGION.latitude),
      longitude: parseCoordinate(params.longitude, DEFAULT_MAP_REGION.longitude),
    }),
    [params.latitude, params.longitude],
  );
  const [draftRegion, setDraftRegion] = useState(initialRegion);
  const [isSaving, setIsSaving] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);

  async function submitSearch() {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 2 || isSearching) return;

    Keyboard.dismiss();
    setIsSearching(true);
    setSearchError(null);

    try {
      const nextResults = await searchPlaces(normalizedQuery);
      setResults(nextResults);
      if (nextResults.length === 0) setSearchError('No matching areas found. Try a neighborhood, landmark, or city.');
    } catch {
      setResults([]);
      setSearchError('Place search is unavailable right now. You can still move the map manually.');
    } finally {
      setIsSearching(false);
    }
  }

  function selectSearchResult(result: PlaceSearchResult) {
    const nextRegion: Region = {
      latitude: result.latitude,
      longitude: result.longitude,
      latitudeDelta: Math.min(draftRegion.latitudeDelta, 0.025),
      longitudeDelta: Math.min(draftRegion.longitudeDelta, 0.025),
    };

    setDraftRegion(nextRegion);
    setSelectedLabel(result.label);
    setQuery(result.label);
    setResults([]);
    setSearchError(null);
    Keyboard.dismiss();
    mapRef.current?.animateToRegion(nextRegion, 450);
  }

  async function confirmLocation() {
    setIsSaving(true);

    try {
      await saveManualLocation({
        latitude: draftRegion.latitude,
        longitude: draftRegion.longitude,
        label: selectedLabel ?? 'Selected area',
        source: 'manual',
      });
      router.back();
    } catch {
      Alert.alert('Could not save location', 'Please try selecting the area again.');
      setIsSaving(false);
    }
  }

  return (
    <View style={styles.screen}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        onRegionChangeComplete={setDraftRegion}
        onPanDrag={() => setSelectedLabel(null)}
        showsCompass={false}
        toolbarEnabled={false}
      />

      <SafeAreaView edges={['top']} style={styles.headerArea} pointerEvents="box-none">
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close location picker"
            onPress={() => router.back()}
            style={styles.iconButton}>
            <Ionicons name="close" size={23} color="#16202A" />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>MANUAL LOCATION</Text>
            <Text style={styles.title}>Move the map to your area</Text>
          </View>
        </View>

        <View style={styles.searchCard}>
          <View style={styles.searchRow}>
            <Ionicons name="search" size={18} color="#66717D" />
            <TextInput
              accessibilityLabel="Search for an area"
              autoCapitalize="words"
              autoCorrect={false}
              clearButtonMode="while-editing"
              onChangeText={(value) => {
                setQuery(value);
                setSearchError(null);
              }}
              onSubmitEditing={() => void submitSearch()}
              placeholder="Search neighborhood, landmark, or city"
              placeholderTextColor="#8B949D"
              returnKeyType="search"
              style={styles.searchInput}
              value={query}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Search places"
              disabled={isSearching || query.trim().length < 2}
              onPress={() => void submitSearch()}
              style={({ pressed }) => [
                styles.searchButton,
                (isSearching || query.trim().length < 2) && styles.searchButtonDisabled,
                pressed && styles.searchButtonPressed,
              ]}>
              {isSearching ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
              )}
            </Pressable>
          </View>

          {searchError ? <Text style={styles.searchError}>{searchError}</Text> : null}

          {results.length > 0 ? (
            <View style={styles.results}>
              {results.map((result, index) => (
                <Pressable
                  accessibilityRole="button"
                  key={result.id}
                  onPress={() => selectSearchResult(result)}
                  style={[styles.resultRow, index > 0 && styles.resultRowBorder]}>
                  <Ionicons name="location-outline" size={18} color="#FF6B4A" />
                  <Text numberOfLines={2} style={styles.resultLabel}>
                    {result.label}
                  </Text>
                </Pressable>
              ))}
              <Pressable
                accessibilityRole="link"
                onPress={() => void Linking.openURL('https://www.openstreetmap.org/copyright')}>
                <Text style={styles.attribution}>Search © OpenStreetMap contributors</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </SafeAreaView>

      <View pointerEvents="none" style={styles.pinWrap}>
        <View style={styles.pin}>
          <Ionicons name="sparkles" size={19} color="#FFFFFF" />
        </View>
        <View style={styles.pinShadow} />
      </View>

      <SafeAreaView edges={['bottom']} style={styles.bottomArea}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Choose this area?</Text>
          <Text style={styles.sheetBody}>
            We will center nearby discovery here. This selection stays on your device and can be changed later.
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={isSaving}
            onPress={() => void confirmLocation()}
            style={[styles.confirmButton, isSaving && styles.confirmButtonDisabled]}>
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.confirmText}>Use this area</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#DCEBDC', flex: 1 },
  headerArea: { left: 0, position: 'absolute', right: 0, top: 0 },
  header: { alignItems: 'center', flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingTop: 8 },
  iconButton: { alignItems: 'center', backgroundColor: '#F7F4EE', borderRadius: 22, height: 44, justifyContent: 'center', shadowColor: '#16202A', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.13, shadowRadius: 12, width: 44 },
  headerCopy: { backgroundColor: '#F7F4EE', borderRadius: 18, flex: 1, paddingHorizontal: 16, paddingVertical: 11, shadowColor: '#16202A', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.13, shadowRadius: 12 },
  eyebrow: { color: '#FF6B4A', fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  title: { color: '#16202A', fontSize: 15, fontWeight: '900', letterSpacing: -0.3, marginTop: 3 },
  searchCard: { backgroundColor: '#F7F4EE', borderRadius: 20, marginHorizontal: 16, marginTop: 10, padding: 8, shadowColor: '#16202A', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.13, shadowRadius: 12 },
  searchRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  searchInput: { color: '#16202A', flex: 1, fontSize: 14, minHeight: 42, paddingVertical: 8 },
  searchButton: { alignItems: 'center', backgroundColor: '#16202A', borderRadius: 18, height: 38, justifyContent: 'center', width: 38 },
  searchButtonDisabled: { opacity: 0.4 },
  searchButtonPressed: { transform: [{ scale: 0.96 }] },
  searchError: { color: '#A23E2B', fontSize: 12, lineHeight: 17, paddingHorizontal: 4, paddingVertical: 7 },
  results: { borderTopColor: '#E0DDD6', borderTopWidth: StyleSheet.hairlineWidth, marginTop: 6, paddingTop: 2 },
  resultRow: { alignItems: 'center', flexDirection: 'row', gap: 9, minHeight: 48, paddingHorizontal: 5, paddingVertical: 7 },
  resultRowBorder: { borderTopColor: '#E7E3DC', borderTopWidth: StyleSheet.hairlineWidth },
  resultLabel: { color: '#27313A', flex: 1, fontSize: 12, fontWeight: '700', lineHeight: 16 },
  attribution: { color: '#66717D', fontSize: 10, paddingBottom: 4, paddingHorizontal: 5, paddingTop: 3, textAlign: 'right', textDecorationLine: 'underline' },
  pinWrap: { alignItems: 'center', left: '50%', marginLeft: -24, marginTop: -47, position: 'absolute', top: '50%', width: 48 },
  pin: { alignItems: 'center', backgroundColor: '#FF6B4A', borderColor: '#FFFFFF', borderRadius: 24, borderWidth: 4, height: 48, justifyContent: 'center', width: 48 },
  pinShadow: { backgroundColor: 'rgba(22,32,42,0.22)', borderRadius: 10, height: 7, marginTop: 5, width: 22 },
  bottomArea: { bottom: 0, left: 0, padding: 12, position: 'absolute', right: 0 },
  sheet: { backgroundColor: '#F7F4EE', borderRadius: 26, padding: 20, shadowColor: '#16202A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 20 },
  sheetTitle: { color: '#16202A', fontSize: 21, fontWeight: '900', letterSpacing: -0.6 },
  sheetBody: { color: '#66717D', fontSize: 13, lineHeight: 19, marginTop: 5 },
  confirmButton: { alignItems: 'center', backgroundColor: '#16202A', borderRadius: 999, flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 17, minHeight: 50, paddingHorizontal: 18 },
  confirmButtonDisabled: { opacity: 0.65 },
  confirmText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
});
