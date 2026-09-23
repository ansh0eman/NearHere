import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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

import { validateDisplayName } from '@/lib/profile-validation';
import { AVATAR_CATALOG } from '@/lib/avatar-catalog';
import { avatarChoice, avatarSeed } from '@/lib/avatar-identity';
import { HostAvatar } from '@/components/host-avatar';
import { Button } from '@/components/ui/button';
import { colors, radii, spacing, typeScale } from '@/constants/design-tokens';
import { useProfile } from '@/providers/profile-provider';
import type { AvatarCatalogId } from '../../../../packages/contracts/avatar';

export default function ProfileOnboardingScreen() {
  const router = useRouter();
  const { completeProfile, refresh, state } = useProfile();
  const [displayName, setDisplayName] = useState('');
  const [avatarId, setAvatarId] = useState<AvatarCatalogId | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const initialAvatarId = useMemo(
    () => state.profile ? avatarChoice(state.profile.avatarConfig, state.profile.id) : null,
    [state.profile],
  );

  useEffect(() => {
    if (state.profile && avatarId === null) {
      setAvatarId(initialAvatarId);
      setDisplayName(state.profile.displayName ?? '');
    }
  }, [avatarId, initialAvatarId, state.profile]);

  async function saveProfile() {
    setErrorMessage(null);
    const validation = validateDisplayName(displayName);
    if (!validation.ok) {
      setErrorMessage(validation.message);
      return;
    }

    if (!avatarId) return;
    const editingExistingProfile = state.status === 'ready';
    const result = await completeProfile(validation.value, avatarId);
    if (!result.ok) {
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
          {state.status === 'ready' && router.canGoBack() && (
            <Pressable accessibilityRole="button" accessibilityLabel="Cancel profile changes" onPress={() => router.back()} style={styles.cancel}>
              <Ionicons name="close" size={20} color={colors.text} />
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          )}
          <View style={styles.preview}>
            {avatarId && <HostAvatar seed={avatarSeed(state.profile?.avatarConfig, state.profile?.id ?? 'nearhere-profile')} avatarId={avatarId} size={150} />}
          </View>
          <Text style={styles.title}>{state.status === 'ready' ? 'Your profile' : 'Make it yours'}</Text>
          <Text style={styles.subtitle}>
            Choose the character people will see when you host or join an activity.
          </Text>

          <Text style={styles.label}>YOUR CHARACTER</Text>
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
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>DISPLAY NAME</Text>
          <TextInput
            accessibilityLabel="Display name"
            autoCapitalize="words"
            autoComplete="name"
            editable={!isSaving}
            maxLength={40}
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
          <Text style={styles.counter}>{displayName.trim().length}/40</Text>

          {(errorMessage ?? saveError) && <Text accessibilityRole="alert" style={styles.error}>{errorMessage ?? saveError}</Text>}

          <Button
            label={isSaving ? 'Saving profile' : 'Save profile'}
            loading={isSaving}
            disabled={isSaving || !avatarId}
            onPress={() => void saveProfile()}
            style={styles.primaryButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  avatarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between', marginTop: spacing.sm },
  avatarOption: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.surface, borderWidth: 1, height: 120, justifyContent: 'center', overflow: 'hidden', width: '31%' },
  avatarOptionSelected: { backgroundColor: colors.raised, borderColor: colors.accent, borderWidth: 2 },
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
