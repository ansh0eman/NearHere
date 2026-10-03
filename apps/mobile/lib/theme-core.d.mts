export type ThemePreferenceValue = 'system' | 'light' | 'dark';
export type AppThemeValue = 'light' | 'dark';
export function resolveTheme(preference: ThemePreferenceValue, system: string | null | undefined): AppThemeValue;
export function isThemePreference(value: unknown): value is ThemePreferenceValue;
