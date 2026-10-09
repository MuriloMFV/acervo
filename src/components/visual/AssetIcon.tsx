import { Image, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { nativeIcons } from '../../assets/icons/native';
import { colors, controls, spacing } from '../../theme';
import type { MediaFormat } from '../../types/collectionPreview';

const rasterIcons = {
  dvd: require('../../assets/icons/dvd.png'),
  'blu-ray': require('../../assets/icons/blu-ray.png'),
  'limited-edition': require('../../assets/icons/limited-edition.png'),
};
type AssetName = keyof typeof nativeIcons | keyof typeof rasterIcons;

// Decorative: adjacent text supplies the accessible label.
export function AssetIcon({ name, size = controls.iconSize, color = colors.accent }: {
  name: AssetName; size?: number; color?: string;
}) {
  if (name in rasterIcons) return <Image accessible={false} source={rasterIcons[name as keyof typeof rasterIcons]} resizeMode="contain" style={{ width: size, height: size, tintColor: color }} />;
  return <SvgXml accessible={false} xml={nativeIcons[name as keyof typeof nativeIcons]} width={size} height={size} color={color} />;
}
const formatIcons: Record<MediaFormat, AssetName> = { DVD: 'dvd', BLURAY: 'blu-ray', UHD_4K: 'uhd-4k', VHS: 'vhs' };
export function MediaFormatIcon({ format, size = controls.iconSize + spacing.sm + spacing.xs, color = colors.accent }: { format: MediaFormat; size?: number; color?: string }) {
  const name = formatIcons[format];
  const height = size * 0.625;
  // DVD/Blu-ray PNGs have transparent margins above/below the mark. Crop only
  // those margins in the view so the supplied artwork fills a compact control.
  if (name === 'dvd' || name === 'blu-ray') return <View accessible={false} style={{ width: size, height, overflow: 'hidden' }}>
    <Image accessible={false} source={rasterIcons[name]} resizeMode="contain" style={{ width: size, height: size, position: 'absolute', top: (height - size) / 2, tintColor: color }} />
  </View>;
  return <SvgXml accessible={false} xml={nativeIcons[name as keyof typeof nativeIcons]} width={size} height={height} color={color} />;
}
