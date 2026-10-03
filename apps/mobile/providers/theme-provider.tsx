import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance, useColorScheme } from 'react-native';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';

import { DAYLIGHT_COLORS, isThemePreference, NIGHT_COLORS, resolveTheme, type AppTheme, type ThemeColors, type ThemePreference } from '@/lib/theme';

const THEME_STORAGE_KEY = 'nearhere.appearance.v1';

type ThemeContextValue = {
  colors: ThemeColors;
  mode: AppTheme;
  preference: ThemePreference;
  ready: boolean;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [ready, setReady] = useState(false);
  const changedBeforeHydration = useRef(false);
  const pendingWrite = useRef<Promise<void>>(Promise.resolve());
  const mode = resolveTheme(preference, systemScheme);
  const colors: ThemeColors = mode === 'light' ? DAYLIGHT_COLORS : NIGHT_COLORS;

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(THEME_STORAGE_KEY).then((saved) => {
      if (active && !changedBeforeHydration.current && isThemePreference(saved)) setPreferenceState(saved);
    }).catch(() => {
      // Theme storage is a convenience; a read failure must not block app startup.
    }).finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    Appearance.setColorScheme(preference === 'system' ? null : preference);
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    changedBeforeHydration.current = true;
    setPreferenceState(next);
    pendingWrite.current = pendingWrite.current.catch(() => undefined).then(() => AsyncStorage.setItem(THEME_STORAGE_KEY, next)).catch(() => {
      // Keep the current in-memory preference if persistence is temporarily unavailable.
    });
  }, []);

  const value = useMemo(() => ({ colors, mode, preference, ready, setPreference }), [colors, mode, preference, ready, setPreference]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside ThemeProvider.');
  return value;
}
