export function resolveTheme(preference, system) {
  if (preference === 'system') return system === 'light' ? 'light' : 'dark';
  return preference;
}

export function isThemePreference(value) {
  return value === 'system' || value === 'light' || value === 'dark';
}
