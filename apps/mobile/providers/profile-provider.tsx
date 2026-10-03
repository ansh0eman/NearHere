import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { claimMyUsername, completeMyProfile, getMyProfile, saveMyAvatarV3 } from '@/lib/profile-repository';
import { createProfileRequestScope } from '@/lib/profile-request-scope';
import { useAuth } from '@/providers/auth-provider';
import type { ProfileOperationResult, ProfileState } from '@/types/profile';
import type { AvatarCatalogId } from '../../../packages/contracts/avatar';
import type { ClaimMyUsernameRequest, SaveMyAvatarV3Request, UpdateMyProfileRequest } from '../../../packages/contracts/user';

type ProfileContextValue = {
  completeProfile: (displayName: string, avatarId: AvatarCatalogId, details?: UpdateMyProfileRequest) => Promise<ProfileOperationResult>;
  claimUsername: (username: string) => Promise<ProfileOperationResult>;
  refresh: () => Promise<void>;
  saveAvatarLook: (appearanceId: SaveMyAvatarV3Request['appearanceId']) => Promise<ProfileOperationResult>;
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
  const [snapshot, setSnapshot] = useState<{ ownerId: string | null; state: ProfileState }>({
    ownerId: null, state: { status: 'signedOut', profile: null },
  });
  const scope = useRef(createProfileRequestScope()).current;
  const userId = session?.user.id ?? null;
  // Effects run after render. Mask the previous account immediately, rather than
  // exposing its name/avatar for one frame while the new request starts.
  const state: ProfileState = snapshot.ownerId === userId ? snapshot.state
    : { status: userId ? 'loading' : 'signedOut', profile: null };

  useLayoutEffect(() => {
    scope.switchAccount(userId);
    return () => scope.invalidate();
  }, [scope, userId]);

  const loadProfile = useCallback(async (id: string) => {
    const request = scope.begin(id);
    if (!request) return;
    setSnapshot({ ownerId: id, state: { status: 'loading', profile: null } });
    const result = await getMyProfile(id);
    if (!scope.isCurrent(request)) return;

    if (!result.ok) {
      setSnapshot({ ownerId: id, state: { status: 'error', profile: null, message: result.message } });
      return;
    }
    setSnapshot({ ownerId: id, state: stateForProfile(result) });
  }, [scope]);

  useEffect(() => {
    if (!userId) {
      setSnapshot({ ownerId: null, state: { status: 'signedOut', profile: null } });
      return;
    }
    void loadProfile(userId);

  }, [loadProfile, userId]);

  const refresh = useCallback(async () => {
    if (!userId) return;
    await loadProfile(userId);
  }, [loadProfile, userId]);

  const completeProfile = useCallback(
    async (displayName: string, avatarId: AvatarCatalogId, details?: UpdateMyProfileRequest): Promise<ProfileOperationResult> => {
      if (!userId) return { ok: false, message: 'Sign in before completing your profile.' };

      const previousProfile = state.profile;
      if (!previousProfile || previousProfile.id !== userId) return { ok: false, message: 'Your profile is still loading. Try again.' };

      const request = scope.begin(userId);
      if (!request) return { ok: false, message: 'The signed-in account changed. Open your profile again.' };
      setSnapshot({ ownerId: userId, state: { status: 'saving', profile: previousProfile } });
      const result = await completeMyProfile(userId, displayName, avatarId, previousProfile, details);
      if (!scope.isCurrent(request)) {
        return { ok: false, message: 'The signed-in account changed before the profile was saved.' };
      }

      if (!result.ok) {
        setSnapshot({ ownerId: userId, state: { status: 'error', profile: previousProfile, message: result.message } });
        return result;
      }
      setSnapshot({ ownerId: userId, state: { status: 'ready', profile: result.profile } });
      return result;
    },
    [scope, state.profile, userId],
  );

  const saveAvatarLook = useCallback(async (appearanceId: SaveMyAvatarV3Request['appearanceId']): Promise<ProfileOperationResult> => {
    if (!userId) return { ok: false, message: 'Sign in before changing your look.' };
    const previousProfile = state.profile;
    if (!previousProfile || previousProfile.id !== userId) return { ok: false, message: 'Your profile is still loading. Try again.' };
    const request = scope.begin(userId);
    if (!request) return { ok: false, message: 'The signed-in account changed. Open your profile again.' };
    setSnapshot({ ownerId: userId, state: { status: 'saving', profile: previousProfile } });
    const result = await saveMyAvatarV3({ appearanceId, expectedRevision: previousProfile.profileRevision });
    if (!scope.isCurrent(request)) return { ok: false, message: 'The signed-in account changed before the look was saved.' };
    if (!result.ok) {
      setSnapshot({ ownerId: userId, state: { status: 'error', profile: previousProfile, message: result.message } });
      return result;
    }
    setSnapshot({ ownerId: userId, state: { status: 'ready', profile: result.profile } });
    return result;
  }, [scope, state.profile, userId]);

  const claimUsername = useCallback(async (username: string): Promise<ProfileOperationResult> => {
    if (!userId) return { ok: false, message: 'Sign in before claiming a username.' };
    const previousProfile = state.profile;
    if (!previousProfile || previousProfile.id !== userId) return { ok: false, message: 'Your profile is still loading. Try again.' };
    const request = scope.begin(userId);
    if (!request) return { ok: false, message: 'The signed-in account changed. Open your profile again.' };
    setSnapshot({ ownerId: userId, state: { status: 'saving', profile: previousProfile } });
    const result = await claimMyUsername({ username, expectedRevision: previousProfile.profileRevision } satisfies ClaimMyUsernameRequest);
    if (!scope.isCurrent(request)) return { ok: false, message: 'The signed-in account changed before the username was saved.' };
    if (!result.ok) {
      setSnapshot({ ownerId: userId, state: { status: 'error', profile: previousProfile, message: result.message } });
      return result;
    }
    setSnapshot({ ownerId: userId, state: { status: 'ready', profile: result.profile } });
    return result;
  }, [scope, state.profile, userId]);

  const value = useMemo(
    () => ({ claimUsername, completeProfile, refresh, saveAvatarLook, state }),
    [claimUsername, completeProfile, refresh, saveAvatarLook, state],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) throw new Error('useProfile must be used inside ProfileProvider');
  return context;
}
