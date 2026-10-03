import { colors as nightColors } from '@/constants/design-tokens';
import { isThemePreference, resolveTheme } from '@/lib/theme-core.mjs';

export { isThemePreference, resolveTheme };

export type ThemePreference = 'system' | 'light' | 'dark';
export type AppTheme = 'light' | 'dark';

export const DAYLIGHT_COLORS = {
  canvas: '#F3F5EE',
  surface: '#FFFFFF',
  raised: '#E5EBDD',
  text: '#19251E',
  mutedText: '#4D6154',
  subtleText: '#66776B',
  accent: '#D4F76A',
  onAccent: '#182013',
  accentText: '#38551B',
  mapPin: '#C64120',
  border: '#CBD5C7',
  danger: '#A12C29',
  dangerSurface: '#FDE9E6',
  warningSurface: '#FFF0CE',
  water: '#B9DCE5',
  park: '#C6DCC0',
  success: '#267249',
  successSurface: '#E1F2E6',
} as const;

export const NIGHT_COLORS = { ...nightColors, accentText: '#D4F76A', dangerSurface: '#422827', successSurface: '#304534' } as const;

export type ThemeColors = { readonly [Key in keyof typeof DAYLIGHT_COLORS]: string };
