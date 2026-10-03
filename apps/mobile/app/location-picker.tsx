import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import type { Region } from 'react-native-maps';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { SelectionMap, type SelectionMapHandle } from '@/components/map/selection-map';
import { SelectionPin } from '@/components/map/selection-pin';

import { DEFAULT_MAP_REGION } from '@/hooks/use-nearby-location';
import { radii, spacing } from '@/constants/design-tokens';
import { saveManualLocation } from '@/lib/location-storage';
import { searchPlaces } from '@/lib/place-search';
import { PlaceSearchResult } from '@/types/place-search';
import { useTheme } from '@/providers/theme-provider';

function parseCoordinate(value: string | string[] | undefined, fallback: number) {
  const parsed = Number(Array.isArray(value) ? value[0] : value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function LocationPickerScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const mapRef = useRef<SelectionMapHandle>(null);
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
    mapRef.current?.moveTo([nextRegion.longitude, nextRegion.latitude], 14, 450);
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
      <SelectionMap
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        center={[initialRegion.longitude, initialRegion.latitude]}
        zoom={Math.max(4, Math.min(16, Math.log2(360 / initialRegion.latitudeDelta)))}
        onViewportChange={([longitude, latitude], userInteraction) => {
          setDraftRegion(current => ({ ...current, latitude, longitude }));
          if (userInteraction) setSelectedLabel(null);
        }}
      />

      <SafeAreaView edges={['top']} style={styles.headerArea} pointerEvents="box-none">
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close location picker"
            onPress={() => router.back()}
            style={styles.iconButton}>
            <Ionicons name="close" size={23} color={colors.text} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>MANUAL LOCATION</Text>
            <Text style={styles.title}>Move the map to your area</Text>
          </View>
        </View>

        <View style={styles.searchCard}>
          <View style={styles.searchRow}>
            <Ionicons name="search" size={18} color={colors.mutedText} />
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
              placeholderTextColor={colors.subtleText}
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
                <ActivityIndicator color={colors.onAccent} size="small" />
              ) : (
                <Ionicons name="arrow-forward" size={17} color={colors.onAccent} />
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
                  <Ionicons name="location-outline" size={18} color={colors.accent} />
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

      <SelectionPin />

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
              <ActivityIndicator color={colors.onAccent} />
            ) : (
              <>
                <Text style={styles.confirmText}>Use this area</Text>
                <Ionicons name="arrow-forward" size={18} color={colors.onAccent} />
              </>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
  screen: { backgroundColor: colors.canvas, flex: 1 },
  headerArea: { left: 0, position: 'absolute', right: 0, top: 0 },
  header: { alignItems: 'center', flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingTop: 8 },
  iconButton: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.pill, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 },
  headerCopy: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.surface, borderWidth: 1, flex: 1, paddingHorizontal: 16, paddingVertical: 11 },
  eyebrow: { color: colors.accent, fontSize: 9, fontWeight: '800', letterSpacing: 1.1 },
  title: { color: colors.text, fontSize: 15, fontWeight: '800', letterSpacing: -0.3, marginTop: 3 },
  searchCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.surface, borderWidth: 1, marginHorizontal: 16, marginTop: 10, padding: 8 },
  searchRow: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  searchInput: { color: colors.text, flex: 1, fontSize: 14, minHeight: 42, paddingVertical: 8 },
  searchButton: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: radii.control, height: 38, justifyContent: 'center', width: 38 },
  searchButtonDisabled: { opacity: 0.4 },
  searchButtonPressed: { transform: [{ scale: 0.96 }] },
  searchError: { color: colors.danger, fontSize: 12, lineHeight: 17, paddingHorizontal: 4, paddingVertical: 7 },
  results: { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, marginTop: 6, paddingTop: 2 },
  resultRow: { alignItems: 'center', flexDirection: 'row', gap: 9, minHeight: 48, paddingHorizontal: 5, paddingVertical: 7 },
  resultRowBorder: { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth },
  resultLabel: { color: colors.text, flex: 1, fontSize: 12, fontWeight: '700', lineHeight: 16 },
  attribution: { color: colors.mutedText, fontSize: 10, paddingBottom: 4, paddingHorizontal: 5, paddingTop: 3, textAlign: 'right', textDecorationLine: 'underline' },
  bottomArea: { bottom: 0, left: 0, padding: spacing.md, position: 'absolute', right: 0 },
  sheet: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.sheet, borderWidth: 1, padding: spacing.lg },
  sheetTitle: { color: colors.text, fontSize: 21, fontWeight: '800', letterSpacing: -0.6 },
  sheetBody: { color: colors.mutedText, fontSize: 13, lineHeight: 19, marginTop: 5 },
  confirmButton: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: radii.pill, flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 17, minHeight: 50, paddingHorizontal: 18 },
  confirmButtonDisabled: { opacity: 0.65 },
  confirmText: { color: colors.onAccent, fontSize: 14, fontWeight: '800' },
  });
}
