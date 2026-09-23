import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import MapView, { Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DEFAULT_MAP_REGION } from '@/hooks/use-nearby-location';
import { saveMeetingPointDraft } from '@/lib/meeting-point-storage';
import { searchPlaces } from '@/lib/place-search';
import type { PlaceSearchResult } from '@/types/place-search';

function coordinate(value: string | string[] | undefined, fallback: number) {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function MeetingPointScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const params = useLocalSearchParams<{ latitude?: string; longitude?: string }>();
  const initialRegion = useMemo<Region>(() => ({
    ...DEFAULT_MAP_REGION,
    latitude: coordinate(params.latitude, DEFAULT_MAP_REGION.latitude),
    longitude: coordinate(params.longitude, DEFAULT_MAP_REGION.longitude),
  }), [params.latitude, params.longitude]);
  const [region, setRegion] = useState(initialRegion);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  async function submitSearch() {
    const normalized = query.trim();
    if (normalized.length < 2 || isSearching) return;
    Keyboard.dismiss();
    setIsSearching(true);
    setSearchError(null);
    try {
      const nextResults = await searchPlaces(normalized);
      setResults(nextResults);
      if (!nextResults.length) setSearchError('No place found. Move the map to place the pin yourself.');
    } catch {
      setResults([]);
      setSearchError('Search is unavailable. You can still move the map and place a pin.');
    } finally {
      setIsSearching(false);
    }
  }

  function chooseResult(result: PlaceSearchResult) {
    const nextRegion: Region = {
      latitude: result.latitude,
      longitude: result.longitude,
      latitudeDelta: Math.min(region.latitudeDelta, 0.012),
      longitudeDelta: Math.min(region.longitudeDelta, 0.012),
    };
    setRegion(nextRegion);
    setSelectedLabel(result.label);
    setQuery(result.label);
    setResults([]);
    setSearchError(null);
    Keyboard.dismiss();
    mapRef.current?.animateToRegion(nextRegion, 400);
  }

  async function confirmPoint() {
    setIsSaving(true);
    try {
      await saveMeetingPointDraft({
        latitude: region.latitude,
        longitude: region.longitude,
        label: selectedLabel ?? 'Dropped pin',
      });
      router.back();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={styles.screen}>
      <MapView
        ref={mapRef}
        initialRegion={initialRegion}
        onPanDrag={() => setSelectedLabel(null)}
        onRegionChangeComplete={setRegion}
        showsCompass={false}
        style={StyleSheet.absoluteFill}
        toolbarEnabled={false}
      />

      <SafeAreaView edges={['top']} pointerEvents="box-none" style={styles.topArea}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Close meeting point picker" accessibilityRole="button" onPress={() => router.back()} style={styles.iconButton}>
            <Ionicons color="#16202A" name="close" size={22} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>PRIVATE MEETING POINT</Text>
            <Text style={styles.title}>Search or move the map</Text>
          </View>
        </View>
        <View style={styles.searchCard}>
          <Ionicons color="#66717D" name="search" size={18} />
          <TextInput
            accessibilityLabel="Search for a private meeting point"
            autoCapitalize="words"
            autoCorrect={false}
            clearButtonMode="while-editing"
            onChangeText={(value) => { setQuery(value); setSearchError(null); }}
            onSubmitEditing={() => void submitSearch()}
            placeholder="Search a café, park, landmark…"
            placeholderTextColor="#8B949D"
            returnKeyType="search"
            style={styles.searchInput}
            value={query}
          />
          <Pressable accessibilityLabel="Search meeting point" accessibilityRole="button" disabled={isSearching || query.trim().length < 2} onPress={() => void submitSearch()} style={[styles.searchButton, (isSearching || query.trim().length < 2) && styles.disabled]}>
            {isSearching ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Ionicons color="#FFFFFF" name="arrow-forward" size={17} />}
          </Pressable>
        </View>
        {searchError ? <Text style={styles.searchError}>{searchError}</Text> : null}
        {results.length ? <View style={styles.results}>
          {results.map((result) => <Pressable accessibilityRole="button" key={result.id} onPress={() => chooseResult(result)} style={styles.result}>
            <Ionicons color="#FF6B4A" name="location-outline" size={18} />
            <Text numberOfLines={2} style={styles.resultLabel}>{result.label}</Text>
          </Pressable>)}
        </View> : null}
      </SafeAreaView>

      <View pointerEvents="none" style={styles.pinWrap}>
        <View style={styles.pin}><Ionicons color="#FFFFFF" name="location" size={21} /></View>
        <View style={styles.pinShadow} />
      </View>

      <SafeAreaView edges={['bottom']} style={styles.bottomArea}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Pin the exact meeting point</Text>
          <Text style={styles.sheetBody}>Only you and accepted participants can see this exact pin. Nearby discovery gets a separate approximate marker.</Text>
          <Pressable accessibilityRole="button" disabled={isSaving} onPress={() => void confirmPoint()} style={[styles.confirmButton, isSaving && styles.disabled]}>
            {isSaving ? <ActivityIndicator color="#FFFFFF" /> : <><Text style={styles.confirmText}>Use this meeting point</Text><Ionicons color="#FFFFFF" name="checkmark" size={18} /></>}
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#DCEBDC', flex: 1 }, topArea: { left: 0, position: 'absolute', right: 0, top: 0 },
  header: { alignItems: 'center', flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 8 },
  iconButton: { alignItems: 'center', backgroundColor: '#F7F4EE', borderRadius: 22, height: 44, justifyContent: 'center', shadowColor: '#16202A', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.13, shadowRadius: 12, width: 44 },
  headerCopy: { backgroundColor: '#F7F4EE', borderRadius: 18, flex: 1, paddingHorizontal: 15, paddingVertical: 10, shadowColor: '#16202A', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.13, shadowRadius: 12 },
  eyebrow: { color: '#FF6B4A', fontSize: 9, fontWeight: '900', letterSpacing: 1.1 }, title: { color: '#16202A', fontSize: 15, fontWeight: '900', marginTop: 3 },
  searchCard: { alignItems: 'center', backgroundColor: '#F7F4EE', borderRadius: 19, flexDirection: 'row', gap: 8, marginHorizontal: 16, marginTop: 10, padding: 7, shadowColor: '#16202A', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.13, shadowRadius: 12 },
  searchInput: { color: '#16202A', flex: 1, fontSize: 14, minHeight: 40 }, searchButton: { alignItems: 'center', backgroundColor: '#16202A', borderRadius: 17, height: 36, justifyContent: 'center', width: 36 }, disabled: { opacity: 0.5 },
  searchError: { backgroundColor: '#F7F4EE', color: '#A23E2B', fontSize: 12, marginHorizontal: 16, paddingHorizontal: 13, paddingTop: 8 },
  results: { backgroundColor: '#F7F4EE', borderRadius: 18, marginHorizontal: 16, marginTop: 7, padding: 8, shadowColor: '#16202A', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.13, shadowRadius: 12 },
  result: { alignItems: 'center', flexDirection: 'row', gap: 9, minHeight: 44, paddingHorizontal: 6 }, resultLabel: { color: '#27313A', flex: 1, fontSize: 12, fontWeight: '700', lineHeight: 16 },
  pinWrap: { alignItems: 'center', left: '50%', marginLeft: -24, marginTop: -47, position: 'absolute', top: '50%', width: 48 }, pin: { alignItems: 'center', backgroundColor: '#FF6B4A', borderColor: '#FFFFFF', borderRadius: 24, borderWidth: 4, height: 48, justifyContent: 'center', width: 48 }, pinShadow: { backgroundColor: 'rgba(22,32,42,0.22)', borderRadius: 10, height: 7, marginTop: 5, width: 22 },
  bottomArea: { bottom: 0, left: 0, padding: 12, position: 'absolute', right: 0 }, sheet: { backgroundColor: '#F7F4EE', borderRadius: 26, padding: 20, shadowColor: '#16202A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 20 }, sheetTitle: { color: '#16202A', fontSize: 19, fontWeight: '900', letterSpacing: -0.5 }, sheetBody: { color: '#66717D', fontSize: 12, lineHeight: 18, marginTop: 5 }, confirmButton: { alignItems: 'center', backgroundColor: '#16202A', borderRadius: 999, flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 16, minHeight: 50, paddingHorizontal: 18 }, confirmText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
});
