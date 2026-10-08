// Screenshots take precedence over the conflicting palettes in DESIGN.md.
export const colors = {
  background: '#11131A',
  surface: '#191B22',
  surfaceElevated: '#1D1F27',
  surfaceActive: '#282A31',
  border: '#282A31',
  primary: '#E5A93C',
  accent: '#FFC665',
  onPrimary: '#432C00',
  accentSurface: '#332D24',
  text: '#E2E2EC',
  textSecondary: '#D4C4B0',
  textMuted: '#9D8F7C',
  danger: '#FFB4AB',
} as const;

export type TextColor = keyof typeof colors;
