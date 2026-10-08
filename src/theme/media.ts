import { colors } from './colors';

// Muted format badges based on the collection screenshot, not saturated chips.
export const mediaFormatColors = {
  DVD: { foreground: '#D0C9FF', background: colors.surfaceActive },
  BLURAY: { foreground: '#AEC6FF', background: '#25486E' },
  UHD_4K: { foreground: colors.accent, background: '#514122' },
  VHS: { foreground: '#FFB4AB', background: '#62433F' },
} as const;

export const movieLayout = {
  columns: 3,
  posterAspectRatio: 2 / 3,
  titleLines: 2,
} as const;
