import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
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
import { clearMeetingPointDraft, readMeetingPointDraft } from '@/lib/meeting-point-storage';
import { formatActivityStart, isFutureStart, QUICK_START_OPTIONS, quickStartDate } from '@/lib/activity-time';
import type { MeetingPointDraft } from '@/types/meeting-point';
import type { ActivityKind, JoinMode } from '@/types/activity';

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
  const params = useLocalSearchParams<{ latitude?: string; longitude?: string }>();
  const initialLatitude = Number(params.latitude);
  const initialLongitude = Number(params.longitude);
  const hasInitialLocation = Number.isFinite(initialLatitude) && Number.isFinite(initialLongitude);
  const [kind, setKind] = useState<ActivityKind>('walk');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startsAt, setStartsAt] = useState(() => quickStartDate(60));
  const [selectedQuickStart, setSelectedQuickStart] = useState<string | null>('1h');
  const [meetingPoint, setMeetingPoint] = useState<MeetingPointDraft | null>(() => hasInitialLocation ? {
    latitude: initialLatitude,
    longitude: initialLongitude,
    label: 'Current discovery area',
  } : null);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
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
    if (Platform.OS === 'android') setDatePickerVisible(false);
    if (event.type === 'dismissed' || !nextValue) return;
    setStartsAt(nextValue);
    setSelectedQuickStart(null);
  }

  async function publishActivity() {
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
    setIsSaving(true);
    const result = await createActivity({
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
    });
    setIsSaving(false);

    if (!result.ok) {
      setErrorMessage(result.message);
      return;
    }
    await clearMeetingPointDraft();
    router.dismissAll();
    router.replace('/');
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Close activity creation" accessibilityRole="button" onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons name="close" size={22} color="#16202A" />
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
            placeholderTextColor="#A3A9AF"
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
            placeholderTextColor="#A3A9AF"
            style={[styles.input, styles.descriptionInput]}
            textAlignVertical="top"
            value={description}
          />

          <Text style={styles.label}>START TIME</Text>
          <View style={styles.segmentRow}>
            {QUICK_START_OPTIONS.map((option) => (
              <Pressable key={option.id} onPress={() => selectQuickStart(option.id, option.minutes)} style={[styles.segment, selectedQuickStart === option.id && styles.segmentSelected]}>
                <Text style={[styles.segmentText, selectedQuickStart === option.id && styles.segmentTextSelected]}>{option.label}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable accessibilityHint="Opens a date and time selector" accessibilityLabel="Choose a custom start date and time" accessibilityRole="button" onPress={() => setDatePickerVisible(true)} style={styles.timePickerRow}>
            <View style={styles.locationIcon}><Ionicons name="calendar-outline" size={19} color="#FF6B4A" /></View>
            <View style={styles.locationCopy}><Text style={styles.locationTitle}>Custom date & time</Text><Text style={styles.locationCoordinate}>{formatActivityStart(startsAt)}</Text></View>
            <Ionicons color="#66717D" name="chevron-forward" size={18} />
          </Pressable>

          <Pressable accessibilityHint="Opens a map where you can search or move a pin" accessibilityLabel="Choose a private meeting point" accessibilityRole="button" onPress={() => router.push({ pathname: '/host/meeting-point', params: { latitude: String(meetingPoint?.latitude ?? initialLatitude), longitude: String(meetingPoint?.longitude ?? initialLongitude) } })} style={styles.locationCard}>
            <View style={styles.locationIcon}><Ionicons name="location" size={19} color="#FF6B4A" /></View>
            <View style={styles.locationCopy}>
              <Text style={styles.locationTitle}>Private meeting point</Text>
              <Text style={styles.locationCoordinate}>{meetingPoint?.label ?? coordinateLabel}</Text>
              <Text style={styles.locationPrivacy}>Search or drop a pin. Discovery receives a separately generated approximate marker within 350 m.</Text>
            </View>
            <Ionicons color="#66717D" name="chevron-forward" size={18} />
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
          {isSaving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.publishText}>Publish activity</Text>}
        </Pressable>

        <Modal animationType="slide" onRequestClose={() => setDatePickerVisible(false)} transparent visible={isDatePickerVisible}>
          <Pressable accessibilityLabel="Close date and time selector" onPress={() => setDatePickerVisible(false)} style={styles.modalBackdrop}>
            <Pressable onPress={(event) => event.stopPropagation()} style={styles.timeSheet}>
              <View style={styles.timeSheetHeader}><Text style={styles.timeSheetTitle}>Choose when it starts</Text><Pressable accessibilityLabel="Close date and time selector" onPress={() => setDatePickerVisible(false)} style={styles.doneButton}><Text style={styles.doneText}>Done</Text></Pressable></View>
              <View style={styles.pickerTabs}><Pressable onPress={() => setPickerMode('date')} style={[styles.pickerTab, pickerMode === 'date' && styles.pickerTabActive]}><Text style={[styles.pickerTabText, pickerMode === 'date' && styles.pickerTabTextActive]}>Date</Text></Pressable><Pressable onPress={() => setPickerMode('time')} style={[styles.pickerTab, pickerMode === 'time' && styles.pickerTabActive]}><Text style={[styles.pickerTabText, pickerMode === 'time' && styles.pickerTabTextActive]}>Time</Text></Pressable></View>
              <DateTimePicker display={Platform.OS === 'ios' ? 'spinner' : 'default'} minimumDate={new Date()} mode={pickerMode} onChange={updateStart} value={startsAt} />
            </Pressable>
          </Pressable>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  capacityText: { color: '#16202A', fontSize: 16, fontWeight: '900', minWidth: 25, textAlign: 'center' },
  closeButton: { alignItems: 'center', borderColor: 'rgba(22,32,42,0.12)', borderRadius: 22, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 },
  content: { paddingBottom: 30, paddingHorizontal: 20 },
  descriptionInput: { minHeight: 105, paddingTop: 16 },
  disabled: { opacity: 0.5 },
  error: { color: '#B63B2B', fontSize: 12, fontWeight: '700', lineHeight: 17, marginTop: 16 },
  eyebrow: { color: '#FF6B4A', fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginTop: 20 },
  flex: { flex: 1 },
  halfField: { flex: 1 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 8 },
  headerSpacer: { width: 44 },
  headerTitle: { color: '#16202A', fontSize: 16, fontWeight: '900' },
  input: { backgroundColor: '#FFFFFF', borderColor: 'rgba(22,32,42,0.12)', borderRadius: 15, borderWidth: 1, color: '#16202A', fontSize: 15, marginTop: 8, minHeight: 54, paddingHorizontal: 15 },
  kindEmoji: { fontSize: 19 },
  kindLabel: { color: '#66717D', fontSize: 11, fontWeight: '800' },
  kindLabelSelected: { color: '#FFFFFF' },
  kindOption: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: 'rgba(22,32,42,0.1)', borderRadius: 16, borderWidth: 1, gap: 4, minWidth: 70, paddingHorizontal: 12, paddingVertical: 11 },
  kindOptionSelected: { backgroundColor: '#16202A', borderColor: '#16202A' },
  kindRow: { gap: 8, paddingVertical: 10 },
  label: { color: '#66717D', fontSize: 10, fontWeight: '900', letterSpacing: 1.1, marginTop: 22 },
  locationCard: { backgroundColor: '#FFF4EF', borderRadius: 18, flexDirection: 'row', gap: 12, marginTop: 24, padding: 15 },
  timePickerRow: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: 'rgba(22,32,42,0.12)', borderRadius: 18, borderWidth: 1, flexDirection: 'row', gap: 12, marginTop: 10, padding: 14 },
  locationCoordinate: { color: '#66717D', fontSize: 11, marginTop: 3 },
  locationCopy: { flex: 1 },
  locationIcon: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 18, height: 36, justifyContent: 'center', width: 36 },
  locationPrivacy: { color: '#8A685C', fontSize: 11, lineHeight: 16, marginTop: 7 },
  locationTitle: { color: '#16202A', fontSize: 13, fontWeight: '900' },
  modeButton: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: 'rgba(22,32,42,0.12)', borderRadius: 14, borderWidth: 1, justifyContent: 'center', marginTop: 8, minHeight: 48 },
  modeText: { color: '#16202A', fontSize: 12, fontWeight: '900' },
  publishButton: { alignItems: 'center', backgroundColor: '#FF6B4A', borderRadius: 999, justifyContent: 'center', marginBottom: 12, marginHorizontal: 20, minHeight: 54 },
  publishText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  screen: { backgroundColor: '#F7F4EE', flex: 1 },
  modalBackdrop: { backgroundColor: 'rgba(22,32,42,0.42)', flex: 1, justifyContent: 'flex-end' },
  timeSheet: { backgroundColor: '#F7F4EE', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20 },
  timeSheetHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  timeSheetTitle: { color: '#16202A', fontSize: 18, fontWeight: '900' }, doneButton: { backgroundColor: '#16202A', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 }, doneText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  pickerTabs: { backgroundColor: '#EAE6DE', borderRadius: 12, flexDirection: 'row', marginTop: 18, padding: 3 }, pickerTab: { alignItems: 'center', borderRadius: 9, flex: 1, paddingVertical: 9 }, pickerTabActive: { backgroundColor: '#FFFFFF' }, pickerTabText: { color: '#66717D', fontSize: 12, fontWeight: '800' }, pickerTabTextActive: { color: '#16202A' },
  segment: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: 'rgba(22,32,42,0.12)', borderRadius: 999, borderWidth: 1, flex: 1, paddingHorizontal: 8, paddingVertical: 11 },
  segmentRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  segmentSelected: { backgroundColor: '#16202A', borderColor: '#16202A' },
  segmentText: { color: '#66717D', fontSize: 11, fontWeight: '800' },
  segmentTextSelected: { color: '#FFFFFF' },
  stepButton: { alignItems: 'center', height: 40, justifyContent: 'center', width: 38 },
  stepText: { color: '#16202A', fontSize: 21, fontWeight: '700' },
  stepper: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: 'rgba(22,32,42,0.12)', borderRadius: 14, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, minHeight: 48 },
  twoColumnRow: { flexDirection: 'row', gap: 12 },
});
