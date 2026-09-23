import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { completeMyProfile, getMyProfile } from '@/lib/profile-repository';
import { useAuth } from '@/providers/auth-provider';
import type { ProfileOperationResult, ProfileState } from '@/types/profile';
import type { AvatarCatalogId } from '../../../packages/contracts/avatar';

type ProfileContextValue = {
  completeProfile: (displayName: string, avatarId: AvatarCatalogId) => Promise<ProfileOperationResult>;
  refresh: () => Promise<void>;
  state: ProfileState;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

function stateForProfile(profile: ProfileOperationResult & { ok: true }): ProfileState {
  return profile.profile.onboardingStatus === 'complete'
    ? { status: 'ready', profile: profile.profile }
    : { status: 'needsProfile', profile: profile.profile };
}

export function ProfileProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const [state, setState] = useState<ProfileState>({ status: 'signedOut', profile: null });
  const requestId = useRef(0);
  const userId = session?.user.id ?? null;

  const loadProfile = useCallback(async (id: string) => {
    const activeRequest = ++requestId.current;
    setState({ status: 'loading', profile: null });
    const result = await getMyProfile(id);
    if (activeRequest !== requestId.current) return;

    if (!result.ok) {
      setState({ status: 'error', profile: null, message: result.message });
      return;
    }
    setState(stateForProfile(result));
  }, []);

  useEffect(() => {
    if (!userId) {
      requestId.current += 1;
      setState({ status: 'signedOut', profile: null });
      return;
    }
    void loadProfile(userId);

    return () => {
      requestId.current += 1;
    };
  }, [loadProfile, userId]);

  const refresh = useCallback(async () => {
    if (!userId) return;
    await loadProfile(userId);
  }, [loadProfile, userId]);

  const completeProfile = useCallback(
    async (displayName: string, avatarId: AvatarCatalogId): Promise<ProfileOperationResult> => {
      if (!userId) return { ok: false, message: 'Sign in before completing your profile.' };

      const previousProfile = state.profile;
      if (!previousProfile) return { ok: false, message: 'Your profile is still loading. Try again.' };

      const activeRequest = ++requestId.current;
      setState({ status: 'saving', profile: previousProfile });
      const result = await completeMyProfile(userId, displayName, avatarId, previousProfile.avatarConfig);
      if (activeRequest !== requestId.current) {
        return { ok: false, message: 'The signed-in account changed before the profile was saved.' };
      }

      if (!result.ok) {
        setState({ status: 'error', profile: previousProfile, message: result.message });
        return result;
      }
      setState({ status: 'ready', profile: result.profile });
      return result;
    },
    [state.profile, userId],
  );

  const value = useMemo(
    () => ({ completeProfile, refresh, state }),
    [completeProfile, refresh, state],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) throw new Error('useProfile must be used inside ProfileProvider');
  return context;
}
