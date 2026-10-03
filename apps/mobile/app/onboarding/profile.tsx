import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { characterCount, PROFILE_INTERESTS, validateDisplayName, validateProfileDetails } from '@/lib/profile-validation';
import { AVATAR_CATALOG } from '@/lib/avatar-catalog';
import { avatarChoice, avatarSeed, isAvatarCatalogId } from '@/lib/avatar-identity';
import { HostAvatar } from '@/components/host-avatar';
import { Button } from '@/components/ui/button';
import { radii, spacing, typeScale } from '@/constants/design-tokens';
import { useProfile } from '@/providers/profile-provider';
import { useTheme } from '@/providers/theme-provider';
import type { AvatarCatalogId } from '../../../../packages/contracts/avatar';

export default function ProfileOnboardingScreen() {
  const { state } = useProfile();
  // Local drafts belong to one account, never to the route's lifetime.
  return <ProfileEditor key={state.profile?.id ?? state.status} />;
}

function ProfileEditor() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { completeProfile, refresh, state } = useProfile();
  const [displayName, setDisplayName] = useState('');
  const [avatarId, setAvatarId] = useState<AvatarCatalogId | null>(null);
  const [bio, setBio] = useState('');
  const [cityLabel, setCityLabel] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [interestsChanged, setInterestsChanged] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const saveInFlight = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  // Network state changes during saving/retry; persisted onboarding does not.
  const editingExistingProfile = state.profile?.onboardingStatus === 'complete';
  const usesAvatarStudio = state.profile?.avatarConfig.version === 3;
  const initialAvatarId = useMemo(
    () => state.profile
      ? (() => {
        const choice = avatarChoice(state.profile.avatarConfig, state.profile.id);
        return isAvatarCatalogId(choice) ? choice : state.profile.avatarConfig.version === 3 ? state.profile.avatarConfig.fallbackAvatarId : 'v1-01';
      })()
      : null,
    [state.profile],
  );

  useEffect(() => {
    if (state.profile && avatarId === null) {
      setAvatarId(initialAvatarId);
      setDisplayName(state.profile.displayName ?? '');
      setBio(state.profile.bio ?? '');
      setCityLabel(state.profile.cityLabel ?? '');
      setInterests(state.profile.interests);
    }
  }, [avatarId, initialAvatarId, state.profile]);

  async function saveProfile() {
    if (saveInFlight.current || conflict) return;
    setErrorMessage(null);
    const validation = validateDisplayName(displayName);
    if (!validation.ok) {
      setErrorMessage(validation.message);
      return;
    }

    if (!avatarId) return;
    const details = validateProfileDetails(bio, cityLabel);
    if (!details.ok) { setErrorMessage(details.message); return; }
    saveInFlight.current = true;
    const result = await completeProfile(validation.value, avatarId, {
      bio: details.bio, cityLabel: details.cityLabel,
      ...(interestsChanged ? { interests } : {}),
    }).finally(() => {
      saveInFlight.current = false;
    });
    if (!mounted.current) return;
    if (!result.ok) {
      setConflict(result.conflict === true);
      setErrorMessage(result.message);
      return;
    }

    if (editingExistingProfile && router.canGoBack()) router.back();
    else router.replace('/');
  }

  if (state.status === 'loading' || state.status === 'signedOut') {
    return (
      <SafeAreaView style={styles.centeredScreen}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.helperText}>Preparing your NearHere profile…</Text>
      </SafeAreaView>
    );
  }

  if (state.status === 'error' && state.profile === null) {
    return (
      <SafeAreaView style={styles.centeredScreen}>
        <View style={styles.warningIcon}>
          <Ionicons name="cloud-offline-outline" color={colors.danger} size={25} />
        </View>
        <Text style={styles.errorTitle}>Your profile did not load</Text>
        <Text style={styles.helperText}>{state.message}</Text>
        <Button label="Try again" onPress={() => void refresh()} style={styles.retryButton} />
      </SafeAreaView>
    );
  }

  const isSaving = state.status === 'saving';
  const saveError = state.status === 'error' ? state.message : null;

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboard}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {editingExistingProfile && router.canGoBack() && (
            <Pressable accessibilityRole="button" accessibilityLabel="Cancel profile changes" disabled={isSaving} onPress={() => router.back()} style={styles.cancel}>
              <Ionicons name="close" size={20} color={colors.text} />
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          )}
          <View style={styles.preview}>
            {avatarId && <HostAvatar
              seed={avatarSeed(state.profile?.avatarConfig, state.profile?.id ?? 'nearhere-profile')}
              avatarId={usesAvatarStudio && state.profile ? avatarChoice(state.profile.avatarConfig, state.profile.id) : avatarId}
              size={150}
            />}
          </View>
          <Text style={styles.title}>{editingExistingProfile ? 'Your profile' : 'Make it yours'}</Text>
          <Text style={styles.subtitle}>
            Choose the character people will see when you host or join an activity.
          </Text>

          {!usesAvatarStudio && <><Text style={styles.label}>YOUR CHARACTER</Text>
          <View style={styles.avatarGrid}>
            {AVATAR_CATALOG.map((character, index) => (
              <Pressable
                key={character.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: avatarId === character.id }}
                accessibilityLabel={`Character ${index + 1}`}
                disabled={isSaving}
                onPress={() => setAvatarId(character.id)}
                style={[styles.avatarOption, avatarId === character.id && styles.avatarOptionSelected]}>
                <HostAvatar seed={character.id} avatarId={character.id} size={104} />
                {avatarId === character.id && <Ionicons name="checkmark-circle" size={20} color={colors.accent} style={styles.selectedCheck} />}
              </Pressable>
            ))}
          </View>
          </>}
          {usesAvatarStudio && <Text style={styles.subtitle}>Your Avatar Studio look is kept while you edit these profile details.</Text>}

          <Text style={styles.label}>DISPLAY NAME</Text>
          <TextInput
            accessibilityLabel="Display name"
            autoCapitalize="words"
            autoComplete="name"
            editable={!isSaving}
            maxLength={80}
            onChangeText={(value) => {
              setDisplayName(value);
              setErrorMessage(null);
            }}
            onSubmitEditing={() => void saveProfile()}
            placeholder="For example, Anshuman"
            placeholderTextColor={colors.subtleText}
            returnKeyType="done"
            style={styles.input}
            value={displayName}
          />
          <Text style={styles.counter}>{characterCount(displayName.trim())}/40</Text>

          <Text style={styles.label}>ABOUT YOU · OPTIONAL</Text>
          <Text style={styles.subtitle}>Your bio, city and interests are currently visible only to you. Your name and character are public when you host.</Text>
          <TextInput accessibilityLabel="Bio" multiline editable={!isSaving} value={bio}
            onChangeText={setBio} maxLength={320} placeholder="What do you enjoy doing nearby?"
            placeholderTextColor={colors.subtleText} style={[styles.input, styles.bio]} />
          <Text style={styles.counter}>{characterCount(bio.trim())}/160</Text>
          <Text style={styles.label}>CITY · OPTIONAL</Text>
          <TextInput accessibilityLabel="City" editable={!isSaving} value={cityLabel}
            onChangeText={setCityLabel} maxLength={160} placeholder="A broad city, not your address"
            placeholderTextColor={colors.subtleText} style={styles.input} />
          <Text style={styles.counter}>{characterCount(cityLabel.trim())}/80</Text>
          <Text style={styles.label}>INTERESTS · OPTIONAL</Text>
          {interests.some(item => !PROFILE_INTERESTS.includes(item as typeof PROFILE_INTERESTS[number])) ? (
            <Text style={styles.subtitle}>Saved interests: {interests.join(', ')}. These older interests are preserved; this editor will not replace them.</Text>
          ) : (
            <View style={styles.interests}>
              {PROFILE_INTERESTS.map(interest => <Pressable key={interest} accessibilityRole="checkbox"
                accessibilityLabel={interest} accessibilityState={{ checked: interests.includes(interest) }}
                disabled={isSaving} style={[styles.interest, interests.includes(interest) && styles.avatarOptionSelected]}
                onPress={() => { setInterestsChanged(true); setInterests(current => current.includes(interest) ? current.filter(item => item !== interest) : [...current, interest]); }}>
                <Text style={styles.interestText}>{interests.includes(interest) ? '✓ ' : ''}{interest}</Text>
              </Pressable>)}
            </View>
          )}

          {(errorMessage ?? saveError) && <Text accessibilityRole="alert" style={styles.error}>{errorMessage ?? saveError}</Text>}
          {conflict && <Button label="Discard draft and reload latest profile" variant="secondary" onPress={() => void refresh()} style={styles.primaryButton} />}

          <Button
            label={isSaving ? 'Saving profile' : 'Save profile'}
            loading={isSaving}
            disabled={isSaving || !avatarId || conflict}
            onPress={() => void saveProfile()}
            style={styles.primaryButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
  bio: { minHeight: 100, paddingTop: spacing.md, textAlignVertical: 'top' },
  interests: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  interest: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.control, minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.md },
  interestText: { color: colors.text, fontSize: 14, textTransform: 'capitalize' },
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between', marginTop: spacing.sm },
  avatarOption: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.surface, borderWidth: 1, height: 120, justifyContent: 'center', overflow: 'hidden', width: '31%' },
  avatarOptionSelected: { backgroundColor: colors.raised, borderColor: colors.accent, borderWidth: 2 },
  selectedCheck: { position: 'absolute', right: 5, top: 5 },
  cancel: { alignItems: 'center', alignSelf: 'flex-start', flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm, minHeight: 44, paddingHorizontal: spacing.xs },
  cancelText: { color: colors.mutedText, fontSize: 14, fontWeight: '600' },
  centeredScreen: { alignItems: 'center', backgroundColor: colors.canvas, flex: 1, justifyContent: 'center', paddingHorizontal: 30 },
  content: { flexGrow: 1, paddingBottom: spacing.xl, paddingHorizontal: spacing.lg },
  counter: { color: colors.subtleText, fontSize: 11, marginTop: 7, textAlign: 'right' },
  error: { color: colors.danger, fontSize: 12, fontWeight: '700', lineHeight: 17, marginTop: 12 },
  errorTitle: { ...typeScale.title, color: colors.text, marginTop: spacing.lg, textAlign: 'center' },
  helperText: { ...typeScale.secondary, color: colors.mutedText, marginTop: spacing.md, maxWidth: 310, textAlign: 'center' },
  input: { backgroundColor: colors.raised, borderColor: colors.border, borderRadius: radii.control, borderWidth: 1, color: colors.text, fontSize: 16, marginTop: spacing.sm, minHeight: 54, paddingHorizontal: spacing.md },
  keyboard: { flex: 1 },
  label: { color: colors.mutedText, fontSize: 11, fontWeight: '800', letterSpacing: 1.1, marginTop: spacing.lg },
  preview: { alignItems: 'center', height: 146, justifyContent: 'flex-end', marginTop: spacing.md },
  primaryButton: { marginTop: spacing.xl },
  retryButton: { marginTop: spacing.xl },
  screen: { backgroundColor: colors.canvas, flex: 1 },
  subtitle: { ...typeScale.secondary, color: colors.mutedText, marginTop: spacing.sm, maxWidth: 340 },
  title: { ...typeScale.title, color: colors.text, marginTop: spacing.sm, maxWidth: 340 },
  warningIcon: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 26, borderWidth: 1, height: 52, justifyContent: 'center', width: 52 },
  });
}
