import type { TextStyle } from 'react-native';
import { fontFamilies } from './fonts';

// Each family alias points to a specific weight; avoid synthetic fontWeight.
export const typography = {
  title: { fontFamily: fontFamilies.title, fontSize: 30, lineHeight: 38 },
  heading: { fontFamily: fontFamilies.heading, fontSize: 22, lineHeight: 28 },
  body: { fontFamily: fontFamilies.body, fontSize: 16, lineHeight: 24 },
  originalTitle: { fontFamily: fontFamilies.bodyItalic, fontSize: 16, lineHeight: 24 },
  caption: { fontFamily: fontFamilies.body, fontSize: 12, lineHeight: 18 },
  label: { fontFamily: fontFamilies.label, fontSize: 14, lineHeight: 20 },
  movieTitle: { fontFamily: fontFamilies.heading, fontSize: 13, lineHeight: 18 },
  searchResultTitle: { fontFamily: fontFamilies.title, fontSize: 18, lineHeight: 24 },
  addOptionLabel: { fontFamily: fontFamilies.heading, fontSize: 14, lineHeight: 20 },
  mediaBadge: { fontFamily: fontFamilies.label, fontSize: 10, lineHeight: 14 },
} as const satisfies Record<string, TextStyle>;

export type TextVariant = keyof typeof typography;
