import { Image, StyleSheet, Text, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { palLogo } from '../../assets/icons/code icons/native';
import type { VideoStandard } from '../../types/videoStandard';
import { colors, radius } from '../../theme';

const raster = {
  NTSC: require('../../assets/icons/code icons/NTSC-Region.png'),
  SECAM: require('../../assets/icons/code icons/secam-native.png'),
};

// Original logos are retained; the PNG inside the SECAM SVG is extracted unchanged.
// Only empty outer margins are clipped in the view. Parent controls supply the
// accessible label; the PAL-M variant includes its suffix inside the icon.
export function VideoStandardIcon({ value, width = 72, height = 40 }: { value: VideoStandard; width?: number; height?: number }) {
  return <View accessible={false} style={[styles.logo, { width, height }, value === 'PAL-M' && styles.variant]}>
    {value === 'PAL' || value === 'PAL-M'
      ? <SvgXml accessible={false} xml={palLogo} width={value === 'PAL-M' ? width * 0.68 : width} height={height} color={colors.text} />
      : <Image accessible={false} source={raster[value]} resizeMode="contain" style={{ position: 'absolute', width, height: width * 2 / 3, top: (height - width * 2 / 3) / 2 }} />}
    {value === 'PAL-M' && <Text accessible={false} allowFontScaling={false} style={[styles.suffix, { fontSize: height * 0.3, lineHeight: height * 0.4 }]}>-M</Text>}
  </View>;
}
const styles = StyleSheet.create({
  logo: { flexShrink: 0, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderRadius: radius.sm, backgroundColor: '#000' },
  variant: { flexDirection: 'row', gap: 2 }, suffix: { color: colors.text, fontWeight: '700' },
});
