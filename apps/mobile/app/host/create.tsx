import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { createActivity } from '@/lib/activity-repository';
import { resolveActivityPublishAttempt, type ActivityPublishAttempt } from '@/lib/activity-creation';
import { radii, spacing } from '@/constants/design-tokens';
import { clearMeetingPointDraft, readMeetingPointDraft } from '@/lib/meeting-point-storage';
import { combineLocalDateAndTime, formatActivityStart, isFutureStart, QUICK_START_OPTIONS, quickStartDate } from '@/lib/activity-time';
import { createRequestId } from '@/lib/request-context';
import type { MeetingPointDraft } from '@/types/meeting-point';
import type { ActivityKind, JoinMode } from '@/types/activity';
import { useTheme } from '@/providers/theme-provider';

const KIND_OPTIONS: { kind: ActivityKind; label: string; emoji: string }[] = [
  { kind: 'walk', label: 'Walk', emoji: '🚶' },
  { kind: 'coffee', label: 'Coffee', emoji: '☕' },
  { kind: 'sports', label: 'Sports', emoji: '🏸' },
  { kind: 'study', label: 'Study', emoji: '📚' },
  { kind: 'coworking', label: 'Cowork', emoji: '💻' },
  { kind: 'creative', label: 'Create', emoji: '🎨' },
];

export default function CreateActivityScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const params = useLocalSearchParams<{ latitude?: string; longitude?: string }>();
  const initialLatitude = Number(params.latitude);
  const initialLongitude = Number(params.longitude);
  const [kind, setKind] = useState<ActivityKind>('walk');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startsAt, setStartsAt] = useState(() => quickStartDate(60));
  const [selectedQuickStart, setSelectedQuickStart] = useState<string | null>('1h');
  // The discovery/device center is only a starting view for the picker, never
  // an implicit private meeting point. Hosting requires an explicit pin/search.
  const [meetingPoint, setMeetingPoint] = useState<MeetingPointDraft | null>(null);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [draftStart, setDraftStart] = useState(startsAt);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const pickerGeneration = useRef(0);
  const androidPickerOpen = useRef(false);
  const publishInFlight = useRef(false);
  const publishAttempt = useRef<ActivityPublishAttempt | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      pickerGeneration.current += 1;
      if (Platform.OS === 'android' && androidPickerOpen.current) {
        androidPickerOpen.current = false;
        void DateTimePickerAndroid.dismiss('date').catch(() => {});
        void DateTimePickerAndroid.dismiss('time').catch(() => {});
      }
    };
  }, []);
  const [capacity, setCapacity] = useState(8);
  const [joinMode, setJoinMode] = useState<JoinMode>('open');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const coordinateLabel = useMemo(() => meetingPoint ? `${meetingPoint.latitude.toFixed(4)}, ${meetingPoint.longitude.toFixed(4)}` : 'No meeting point selected', [meetingPoint]);

  useFocusEffect(useCallback(() => {
    let isActive = true;
    async function restorePinnedPoint() {
      const draft = await readMeetingPointDraft();
      if (!isActive || !draft) return;
      setMeetingPoint(draft);
      await clearMeetingPointDraft();
    }
    void restorePinnedPoint();
    return () => { isActive = false; };
  }, []));

  function selectQuickStart(id: string, minutes: number) {
    setStartsAt(quickStartDate(minutes));
    setSelectedQuickStart(id);
  }

  function updateStart(event: DateTimePickerEvent, nextValue?: Date) {
    if (event.type !== 'set' || !nextValue) return;
    setDraftStart(nextValue);
    setPickerError(null);
  }

  function applyCustomStart(value: Date): boolean {
    // Recheck at the moment of confirmation: a future draft can become past
    // while a person leaves the picker open.
    if (!isFutureStart(value)) {
      const message = 'Choose a start time in the future.';
      if (Platform.OS === 'android') setErrorMessage(message);
      else setPickerError(message);
      return false;
    }
    setStartsAt(value);
    setSelectedQuickStart(null);
    setPickerError(null);
    return true;
  }

  function openCustomStart() {
    setPickerError(null);
    if (Platform.OS !== 'android') {
      setDraftStart(new Date(startsAt));
      setPickerMode('date');
      setDatePickerVisible(true);
      return;
    }
    if (androidPickerOpen.current) return;
    androidPickerOpen.current = true;
    const generation = ++pickerGeneration.current;
    const active = () => mounted.current && generation === pickerGeneration.current;
    const onPickerError = () => {
      if (!active()) return;
      androidPickerOpen.current = false;
      setErrorMessage('The date selector could not open. Try again or choose a quick start time.');
    };
    DateTimePickerAndroid.open({
      value: startsAt, mode: 'date', minimumDate: new Date(), onError: onPickerError,
      onChange: (dateEvent, day) => {
        if (!active()) return;
        if (dateEvent.type !== 'set' || !day) { androidPickerOpen.current = false; return; }
        DateTimePickerAndroid.open({
          value: combineLocalDateAndTime(day, startsAt), mode: 'time', onError: onPickerError,
          onChange: (timeEvent, clock) => {
            if (!active()) return;
            androidPickerOpen.current = false;
            if (timeEvent.type !== 'set' || !clock) return;
            applyCustomStart(combineLocalDateAndTime(day, clock));
          },
        });
      },
    });
  }

  async function publishActivity() {
    if (publishInFlight.current) return;
    setErrorMessage(null);
    const normalizedTitle = title.trim();
    if (normalizedTitle.length < 3 || normalizedTitle.length > 80) {
      setErrorMessage('Use between 3 and 80 characters for the title.');
      return;
    }
    if (description.length > 1000) {
      setErrorMessage('Keep the description under 1,000 characters.');
      return;
    }
    if (!meetingPoint) {
      setErrorMessage('Choose an exact private meeting point before publishing.');
      return;
    }
    if (!isFutureStart(startsAt)) {
      setErrorMessage('Choose a start time in the future.');
      return;
    }

    const endsAt = new Date(startsAt.getTime() + 60 * 60_000);
    publishInFlight.current = true;
    setIsSaving(true);
    try {
    const draft = {
      kind,
      title: normalizedTitle,
      description: description.trim(),
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      privateLatitude: meetingPoint.latitude,
      privateLongitude: meetingPoint.longitude,
      privacyRadiusM: 350,
      capacity,
      joinMode,
    };
    const fingerprint = JSON.stringify(draft);
    const attempt = resolveActivityPublishAttempt(publishAttempt.current, fingerprint, () => createRequestId('publish'));
    publishAttempt.current = attempt;
    const result = await createActivity({ ...draft, requestId: attempt.requestId });
    if (!mounted.current) return;

    if (!result.ok) {
      setErrorMessage(result.message);
      return;
    }
    await clearMeetingPointDraft();
    publishAttempt.current = null;
    if (!mounted.current) return;
    router.dismissAll();
    router.replace('/');
    } catch {
      if (mounted.current) setErrorMessage('We could not confirm publication. Try again; the same draft will not create a duplicate.');
    } finally {
      publishInFlight.current = false;
      if (mounted.current) setIsSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Close activity creation" accessibilityRole="button" onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons name="close" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Host something</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardDismissMode="interactive" keyboardShouldPersistTaps="handled">
          <Text style={styles.eyebrow}>ACTIVITY TYPE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kindRow}>
            {KIND_OPTIONS.map((option) => (
              <Pressable
                key={option.kind}
                accessibilityRole="button"
                accessibilityState={{ selected: kind === option.kind }}
                onPress={() => setKind(option.kind)}
                style={[styles.kindOption, kind === option.kind && styles.kindOptionSelected]}>
                <Text style={styles.kindEmoji}>{option.emoji}</Text>
                <Text style={[styles.kindLabel, kind === option.kind && styles.kindLabelSelected]}>{option.label}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.label}>TITLE</Text>
          <TextInput
            accessibilityLabel="Activity title"
            maxLength={80}
            onChangeText={(value) => { setTitle(value); setErrorMessage(null); }}
            placeholder="Golden hour lake walk"
            placeholderTextColor={colors.subtleText}
            style={styles.input}
            value={title}
          />

          <Text style={styles.label}>DESCRIPTION</Text>
          <TextInput
            accessibilityLabel="Activity description"
            maxLength={1000}
            multiline
            onChangeText={(value) => { setDescription(value); setErrorMessage(null); }}
            placeholder="What should people expect?"
            placeholderTextColor={colors.subtleText}
            style={[styles.input, styles.descriptionInput]}
            textAlignVertical="top"
            value={description}
          />

          <Text style={styles.label}>START TIME</Text>
          <View style={styles.segmentRow}>
            {QUICK_START_OPTIONS.map((option) => (
              <Pressable key={option.id} accessibilityRole="radio" accessibilityState={{ checked: selectedQuickStart === option.id }} onPress={() => selectQuickStart(option.id, option.minutes)} style={[styles.segment, selectedQuickStart === option.id && styles.segmentSelected]}>
                <Text style={[styles.segmentText, selectedQuickStart === option.id && styles.segmentTextSelected]}>{option.label}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable accessibilityHint="Opens a date and time selector" accessibilityLabel="Choose a custom start date and time" accessibilityValue={{ text: formatActivityStart(startsAt) }} accessibilityRole="button" onPress={openCustomStart} style={styles.timePickerRow}>
            <View style={styles.locationIcon}><Ionicons name="calendar-outline" size={19} color={colors.accent} /></View>
            <View style={styles.locationCopy}><Text style={styles.locationTitle}>Custom date & time</Text><Text style={styles.locationCoordinate}>{formatActivityStart(startsAt)}</Text></View>
            <Ionicons color={colors.mutedText} name="chevron-forward" size={18} />
          </Pressable>

          <Pressable accessibilityHint="Opens a map where you can search or move a pin" accessibilityLabel="Choose a private meeting point" accessibilityRole="button" onPress={() => router.push({ pathname: '/host/meeting-point', params: { latitude: String(meetingPoint?.latitude ?? initialLatitude), longitude: String(meetingPoint?.longitude ?? initialLongitude) } })} style={styles.locationCard}>
            <View style={styles.locationIcon}><Ionicons name="location" size={19} color={colors.accent} /></View>
            <View style={styles.locationCopy}>
              <Text style={styles.locationTitle}>Private meeting point</Text>
              <Text ellipsizeMode="tail" numberOfLines={2} style={styles.locationCoordinate}>{meetingPoint?.label ?? coordinateLabel}</Text>
              <Text style={styles.locationPrivacy}>Search or drop a pin. Discovery receives a separately generated approximate marker within 350 m.</Text>
            </View>
            <Ionicons color={colors.mutedText} name="chevron-forward" size={18} />
          </Pressable>

          <View style={styles.twoColumnRow}>
            <View style={styles.halfField}>
              <Text style={styles.label}>CAPACITY</Text>
              <View style={styles.stepper}>
                <Pressable accessibilityLabel="Decrease capacity" onPress={() => setCapacity((value) => Math.max(2, value - 1))} style={styles.stepButton}><Text style={styles.stepText}>−</Text></Pressable>
                <Text style={styles.capacityText}>{capacity}</Text>
                <Pressable accessibilityLabel="Increase capacity" onPress={() => setCapacity((value) => Math.min(50, value + 1))} style={styles.stepButton}><Text style={styles.stepText}>+</Text></Pressable>
              </View>
            </View>
            <View style={styles.halfField}>
              <Text style={styles.label}>JOIN MODE</Text>
              <Pressable onPress={() => setJoinMode((value) => value === 'open' ? 'approval' : 'open')} style={styles.modeButton}>
                <Text style={styles.modeText}>{joinMode === 'open' ? 'Open join' : 'Approval'}</Text>
              </Pressable>
            </View>
          </View>

          {errorMessage && <Text style={styles.error}>{errorMessage}</Text>}
        </ScrollView>

        <Pressable accessibilityRole="button" disabled={isSaving} onPress={() => void publishActivity()} style={[styles.publishButton, isSaving && styles.disabled]}>
          {isSaving ? <ActivityIndicator color={colors.onAccent} /> : <Text style={styles.publishText}>Publish activity</Text>}
        </Pressable>

        <Modal animationType="slide" onRequestClose={() => setDatePickerVisible(false)} transparent visible={isDatePickerVisible}>
          <View style={styles.modalBackdrop}>
            <Pressable accessible={false} onPress={() => setDatePickerVisible(false)} style={StyleSheet.absoluteFill} />
            <View accessibilityViewIsModal style={styles.timeSheet}>
              <View style={styles.timeSheetHeader}>
                <Pressable accessibilityRole="button" accessibilityLabel="Cancel date and time changes" onPress={() => setDatePickerVisible(false)} style={styles.doneButton}><Text style={styles.doneText}>Cancel</Text></Pressable>
                <Text style={styles.timeSheetTitle}>Start time</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="Apply custom date and time" onPress={() => { if (applyCustomStart(draftStart)) setDatePickerVisible(false); }} style={styles.doneButton}><Text style={styles.doneText}>Done</Text></Pressable>
              </View>
              <View style={styles.pickerTabs}><Pressable accessibilityRole="tab" accessibilityState={{ selected: pickerMode === 'date' }} onPress={() => setPickerMode('date')} style={[styles.pickerTab, pickerMode === 'date' && styles.pickerTabActive]}><Text style={[styles.pickerTabText, pickerMode === 'date' && styles.pickerTabTextActive]}>Date</Text></Pressable><Pressable accessibilityRole="tab" accessibilityState={{ selected: pickerMode === 'time' }} onPress={() => setPickerMode('time')} style={[styles.pickerTab, pickerMode === 'time' && styles.pickerTabActive]}><Text style={[styles.pickerTabText, pickerMode === 'time' && styles.pickerTabTextActive]}>Time</Text></Pressable></View>
              <DateTimePicker themeVariant="dark" display="spinner" minimumDate={new Date()} mode={pickerMode} onChange={updateStart} value={draftStart} />
              {pickerError && <Text accessibilityRole="alert" style={styles.error}>{pickerError}</Text>}
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
  capacityText: { color: colors.text, fontSize: 16, fontWeight: '800', minWidth: 25, textAlign: 'center' },
  closeButton: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.pill, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 },
  content: { paddingBottom: spacing.xl, paddingHorizontal: spacing.lg },
  descriptionInput: { minHeight: 105, paddingTop: 16 },
  disabled: { opacity: 0.5 },
  error: { color: colors.danger, fontSize: 12, fontWeight: '700', lineHeight: 17, marginTop: spacing.lg },
  eyebrow: { color: colors.accent, fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginTop: 20 },
  flex: { flex: 1 },
  halfField: { flex: 1 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  headerSpacer: { width: 44 },
  headerTitle: { color: colors.text, fontSize: 16, fontWeight: '800' },
  input: { backgroundColor: colors.raised, borderColor: colors.border, borderRadius: radii.control, borderWidth: 1, color: colors.text, fontSize: 15, marginTop: spacing.sm, minHeight: 54, paddingHorizontal: spacing.md },
  kindEmoji: { fontSize: 19 },
  kindLabel: { color: colors.mutedText, fontSize: 11, fontWeight: '700' },
  kindLabelSelected: { color: colors.onAccent },
  kindOption: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.control, borderWidth: 1, gap: 4, minWidth: 70, paddingHorizontal: 12, paddingVertical: 11 },
  kindOptionSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  kindRow: { gap: spacing.sm, paddingVertical: spacing.md },
  label: { color: colors.mutedText, fontSize: 10, fontWeight: '800', letterSpacing: 1.1, marginTop: 22 },
  locationCard: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.surface, borderWidth: 1, flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl, padding: spacing.md },
  timePickerRow: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.control, borderWidth: 1, flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm, padding: spacing.md },
  locationCoordinate: { color: colors.mutedText, fontSize: 11, marginTop: 3 },
  locationCopy: { flex: 1 },
  locationIcon: { alignItems: 'center', backgroundColor: colors.raised, borderRadius: radii.control, height: 36, justifyContent: 'center', width: 36 },
  locationPrivacy: { color: colors.subtleText, fontSize: 11, lineHeight: 16, marginTop: 7 },
  locationTitle: { color: colors.text, fontSize: 13, fontWeight: '800' },
  modeButton: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.control, borderWidth: 1, justifyContent: 'center', marginTop: spacing.sm, minHeight: 48 },
  modeText: { color: colors.text, fontSize: 12, fontWeight: '800' },
  publishButton: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: radii.pill, justifyContent: 'center', marginBottom: spacing.md, marginHorizontal: spacing.lg, minHeight: 54 },
  publishText: { color: colors.onAccent, fontSize: 14, fontWeight: '800' },
  screen: { backgroundColor: colors.canvas, flex: 1 },
  modalBackdrop: { backgroundColor: 'rgba(0,0,0,0.62)', flex: 1, justifyContent: 'flex-end' },
  timeSheet: { backgroundColor: colors.surface, borderColor: colors.border, borderTopLeftRadius: radii.sheet, borderTopRightRadius: radii.sheet, borderWidth: 1, padding: spacing.xl },
  timeSheetHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  timeSheetTitle: { color: colors.text, fontSize: 18, fontWeight: '800' }, doneButton: { backgroundColor: colors.accent, borderRadius: radii.pill, paddingHorizontal: 14, paddingVertical: 8 }, doneText: { color: colors.onAccent, fontSize: 12, fontWeight: '800' },
  pickerTabs: { backgroundColor: colors.raised, borderRadius: radii.control, flexDirection: 'row', marginTop: spacing.lg, padding: 3 }, pickerTab: { alignItems: 'center', borderRadius: 9, flex: 1, paddingVertical: 9 }, pickerTabActive: { backgroundColor: colors.accent }, pickerTabText: { color: colors.mutedText, fontSize: 12, fontWeight: '700' }, pickerTabTextActive: { color: colors.onAccent },
  segment: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.pill, borderWidth: 1, flex: 1, paddingHorizontal: 8, paddingVertical: 11 },
  segmentRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  segmentSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
  segmentText: { color: colors.mutedText, fontSize: 11, fontWeight: '700' },
  segmentTextSelected: { color: colors.onAccent },
  stepButton: { alignItems: 'center', height: 40, justifyContent: 'center', width: 38 },
  stepText: { color: colors.text, fontSize: 21, fontWeight: '700' },
  stepper: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.control, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm, minHeight: 48 },
  twoColumnRow: { flexDirection: 'row', gap: spacing.md },
  });
}
