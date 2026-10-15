import type { TextStyle } from 'react-native';
import { fontFamilies } from './fonts';

// Each family alias points to a specific weight; avoid synthetic fontWeight.
export const typography = {
  title: { fontFamily: fontFamilies.title, fontSize: 32, lineHeight: 38, letterSpacing: -0.8 },
  detailTitle: { fontFamily: fontFamilies.title, fontSize: 27, lineHeight: 32, letterSpacing: -0.5 },
  heading: { fontFamily: fontFamilies.heading, fontSize: 22, lineHeight: 28, letterSpacing: -0.4 },
  body: { fontFamily: fontFamilies.body, fontSize: 16, lineHeight: 24 },
  originalTitle: { fontFamily: fontFamilies.bodyItalic, fontSize: 16, lineHeight: 24 },
  display: { fontFamily: fontFamilies.title, fontSize: 48, lineHeight: 54, letterSpacing: -1.6, fontVariant: ['tabular-nums'] },
  eyebrow: { fontFamily: fontFamilies.label, fontSize: 11, lineHeight: 16, letterSpacing: 1.1 },
  caption: { fontFamily: fontFamilies.body, fontSize: 12, lineHeight: 18 },
  label: { fontFamily: fontFamilies.label, fontSize: 14, lineHeight: 20 },
  movieTitle: { fontFamily: fontFamilies.heading, fontSize: 13, lineHeight: 18, letterSpacing: -0.1 },
  searchResultTitle: { fontFamily: fontFamilies.title, fontSize: 18, lineHeight: 24 },
  addOptionLabel: { fontFamily: fontFamilies.heading, fontSize: 14, lineHeight: 20 },
  mediaBadge: { fontFamily: fontFamilies.label, fontSize: 10, lineHeight: 14 },
} as const satisfies Record<string, TextStyle>;

export type TextVariant = keyof typeof typography;
