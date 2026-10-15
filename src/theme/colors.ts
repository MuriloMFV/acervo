// Quiet graphite surfaces keep physical cover artwork in the foreground.
export const colors = {
  background: '#101114',
  surface: '#191A1E',
  surfaceElevated: '#222327',
  surfaceActive: '#303136',
  border: '#35363B',
  primary: '#DDB569',
  accent: '#E8C583',
  onPrimary: '#241B0D',
  accentSurface: '#30291E',
  text: '#F2F0EA',
  textSecondary: '#C9C6BF',
  textMuted: '#A09D96',
  danger: '#FFB4AB',
} as const;

export type TextColor = keyof typeof colors;
