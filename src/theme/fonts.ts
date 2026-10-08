import { Syne_600SemiBold } from '@expo-google-fonts/syne/600SemiBold';
import { Syne_700Bold } from '@expo-google-fonts/syne/700Bold';
import { PlusJakartaSans_400Regular } from '@expo-google-fonts/plus-jakarta-sans/400Regular';
import { PlusJakartaSans_400Regular_Italic } from '@expo-google-fonts/plus-jakarta-sans/400Regular_Italic';
import { PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans/600SemiBold';

export const fontFamilies = {
  title: 'AcervoTitleBold',
  heading: 'AcervoHeadingSemiBold',
  body: 'AcervoBodyRegular',
  bodyItalic: 'AcervoBodyItalic',
  label: 'AcervoLabelSemiBold',
} as const;

// Import only the assets used by the current typography tokens.
export const fontAssets = {
  [fontFamilies.title]: Syne_700Bold,
  [fontFamilies.heading]: Syne_600SemiBold,
  [fontFamilies.body]: PlusJakartaSans_400Regular,
  [fontFamilies.bodyItalic]: PlusJakartaSans_400Regular_Italic,
  [fontFamilies.label]: PlusJakartaSans_600SemiBold,
};
