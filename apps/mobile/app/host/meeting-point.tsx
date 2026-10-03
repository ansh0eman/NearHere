import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import type { Region } from 'react-native-maps';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SelectionMap, type SelectionMapHandle } from '@/components/map/selection-map';
import { SelectionPin } from '@/components/map/selection-pin';

import { DEFAULT_MAP_REGION } from '@/hooks/use-nearby-location';
import { radii, spacing } from '@/constants/design-tokens';
import { saveMeetingPointDraft } from '@/lib/meeting-point-storage';
import { searchPlaces } from '@/lib/place-search';
import type { PlaceSearchResult } from '@/types/place-search';
import { useTheme } from '@/providers/theme-provider';

function coordinate(value: string | string[] | undefined, fallback: number) {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function MeetingPointScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const mapRef = useRef<SelectionMapHandle>(null);
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
    mapRef.current?.moveTo([nextRegion.longitude, nextRegion.latitude], 15, 400);
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
      <SelectionMap
        ref={mapRef}
        center={[initialRegion.longitude, initialRegion.latitude]}
        zoom={Math.max(4, Math.min(17, Math.log2(360 / initialRegion.latitudeDelta)))}
        onViewportChange={([longitude, latitude], userInteraction) => {
          setRegion(current => ({ ...current, latitude, longitude }));
          if (userInteraction) setSelectedLabel(null);
        }}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView edges={['top']} pointerEvents="box-none" style={styles.topArea}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Close meeting point picker" accessibilityRole="button" onPress={() => router.back()} style={styles.iconButton}>
            <Ionicons color={colors.text} name="close" size={22} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>PRIVATE MEETING POINT</Text>
            <Text style={styles.title}>Search or move the map</Text>
          </View>
        </View>
        <View style={styles.searchCard}>
          <Ionicons color={colors.mutedText} name="search" size={18} />
          <TextInput
            accessibilityLabel="Search for a private meeting point"
            autoCapitalize="words"
            autoCorrect={false}
            clearButtonMode="while-editing"
            onChangeText={(value) => { setQuery(value); setSearchError(null); }}
            onSubmitEditing={() => void submitSearch()}
            placeholder="Search a café, park, landmark…"
            placeholderTextColor={colors.subtleText}
            returnKeyType="search"
            style={styles.searchInput}
            value={query}
          />
          <Pressable accessibilityLabel="Search meeting point" accessibilityRole="button" disabled={isSearching || query.trim().length < 2} onPress={() => void submitSearch()} style={[styles.searchButton, (isSearching || query.trim().length < 2) && styles.disabled]}>
            {isSearching ? <ActivityIndicator color={colors.onAccent} size="small" /> : <Ionicons color={colors.onAccent} name="arrow-forward" size={17} />}
          </Pressable>
        </View>
        {searchError ? <Text style={styles.searchError}>{searchError}</Text> : null}
        {results.length ? <View style={styles.results}>
          {results.map((result) => <Pressable accessibilityRole="button" key={result.id} onPress={() => chooseResult(result)} style={styles.result}>
            <Ionicons color={colors.accent} name="location-outline" size={18} />
            <Text numberOfLines={2} style={styles.resultLabel}>{result.label}</Text>
          </Pressable>)}
        </View> : null}
      </SafeAreaView>

      <SelectionPin />

      <SafeAreaView edges={['bottom']} style={styles.bottomArea}>
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Pin the exact meeting point</Text>
          <Text style={styles.sheetBody}>Only you and accepted participants can see this exact pin. Nearby discovery gets a separate approximate marker.</Text>
          <Pressable accessibilityRole="button" disabled={isSaving} onPress={() => void confirmPoint()} style={[styles.confirmButton, isSaving && styles.disabled]}>
            {isSaving ? <ActivityIndicator color={colors.onAccent} /> : <><Text style={styles.confirmText}>Use this meeting point</Text><Ionicons color={colors.onAccent} name="checkmark" size={18} /></>}
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
  screen: { backgroundColor: colors.canvas, flex: 1 }, topArea: { left: 0, position: 'absolute', right: 0, top: 0 },
  header: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  iconButton: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.pill, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 },
  headerCopy: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.surface, borderWidth: 1, flex: 1, paddingHorizontal: 15, paddingVertical: 10 },
  eyebrow: { color: colors.accent, fontSize: 9, fontWeight: '800', letterSpacing: 1.1 }, title: { color: colors.text, fontSize: 15, fontWeight: '800', marginTop: 3 },
  searchCard: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.surface, borderWidth: 1, flexDirection: 'row', gap: 8, marginHorizontal: spacing.lg, marginTop: 10, padding: 7 },
  searchInput: { color: colors.text, flex: 1, fontSize: 14, minHeight: 40 }, searchButton: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: radii.control, height: 36, justifyContent: 'center', width: 36 }, disabled: { opacity: 0.5 },
  searchError: { backgroundColor: colors.surface, color: colors.danger, fontSize: 12, marginHorizontal: spacing.lg, paddingHorizontal: 13, paddingTop: 8 },
  results: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.surface, borderWidth: 1, marginHorizontal: spacing.lg, marginTop: 7, padding: 8 },
  result: { alignItems: 'center', flexDirection: 'row', gap: 9, minHeight: 44, paddingHorizontal: 6 }, resultLabel: { color: colors.text, flex: 1, fontSize: 12, fontWeight: '700', lineHeight: 16 },
  bottomArea: { bottom: 0, left: 0, padding: spacing.md, position: 'absolute', right: 0 }, sheet: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.sheet, borderWidth: 1, padding: spacing.lg }, sheetTitle: { color: colors.text, fontSize: 19, fontWeight: '800', letterSpacing: -0.5 }, sheetBody: { color: colors.mutedText, fontSize: 12, lineHeight: 18, marginTop: 5 }, confirmButton: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: radii.pill, flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 16, minHeight: 50, paddingHorizontal: 18 }, confirmText: { color: colors.onAccent, fontSize: 14, fontWeight: '800' },
  });
}
