/** Semantic tokens keep color/spacing decisions consistent across native screens. */
export const colors = {
  canvas: '#111516',
  surface: '#1C2223',
  raised: '#272F30',
  text: '#F4F5EF',
  mutedText: '#AEBAB6',
  subtleText: '#82908B',
  accent: '#D4F76A',
  onAccent: '#182013',
  border: '#3B4643',
  danger: '#FF9E96',
  warningSurface: '#332B1C',
  water: '#243E47',
  park: '#304534',
  success: '#9DE1B2',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radii = { control: 12, surface: 20, sheet: 28, pill: 999 } as const;
export const touchTarget = 44;

export const typeScale = {
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700' as const, letterSpacing: -0.7 },
  section: { fontSize: 20, lineHeight: 26, fontWeight: '700' as const, letterSpacing: -0.35 },
  body: { fontSize: 16, lineHeight: 23, fontWeight: '400' as const },
  secondary: { fontSize: 14, lineHeight: 20, fontWeight: '400' as const },
  label: { fontSize: 12, lineHeight: 16, fontWeight: '600' as const, letterSpacing: 0.35 },
} as const;
