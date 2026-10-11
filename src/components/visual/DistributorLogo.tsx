import { memo, useId } from 'react';
import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import Svg, { Defs, FeColorMatrix, Filter, Image as SvgImage, SvgXml } from 'react-native-svg';
import { distributorSvgLogos } from '../../assets/distribuidoras/native';
import type { DistributorId } from '../../data/distributors';
import { distributorRasterMatrix } from '../../utils/distributorArtwork';
import { colors } from '../../theme';

// Adapt black vector lettering to the dark theme; retain Marvel's red/white.
const themedSvgLogos = Object.fromEntries(Object.entries(distributorSvgLogos).map(([id, xml]) => [id, xml.replace(/#000000|#010101|#231F20/g, 'currentColor')])) as Record<keyof typeof distributorSvgLogos, string>;

const raster: Partial<Record<DistributorId, ImageSourcePropType>> = {
  columbia: require('../../assets/distribuidoras/columbia-pictures-logo-png_seeklogo-404116.png'),
  europa: require('../../assets/distribuidoras/Europa_filmes.webp'),
  playarte: require('../../assets/distribuidoras/Grupo_PlayArte_logo.png'),
  imagem: require('../../assets/distribuidoras/Imagem_Filmes_logo_p&b.png'),
  mgm: require('../../assets/distribuidoras/mgm-dvd-seeklogo.png'),
  paramount: require('../../assets/distribuidoras/paramount-seeklogo.png'),
  touchstone: require('../../assets/distribuidoras/touchstone-home-entertainment-seeklogo.png'),
  disney: require('../../assets/distribuidoras/disney-native.png'),
};

export const DistributorLogo = memo(function DistributorLogo({ id, width = 80, height = 52 }: {
  id: DistributorId; width?: number; height?: number;
}) {
  const filterId = `distributor-${useId().replace(/:/g, '')}`;
  const xml = id in themedSvgLogos ? themedSvgLogos[id as keyof typeof themedSvgLogos] : null;
  const source = raster[id];
  const padding = 5;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  const matrix = distributorRasterMatrix(id, colors.text);
  return <View accessible={false} style={[styles.logo, { width, height, padding }]}>
    {xml ? <SvgXml accessible={false} xml={xml} width={innerWidth} height={innerHeight} fill={colors.text} color={colors.text} />
      : source && (matrix ? <Svg accessible={false} width={innerWidth} height={innerHeight}>
        <Defs><Filter id={filterId} x="0" y="0" width="100%" height="100%"><FeColorMatrix type="matrix" values={matrix} /></Filter></Defs>
        <SvgImage accessible={false} href={source} width={innerWidth} height={innerHeight} preserveAspectRatio="xMidYMid meet" filter={`url(#${filterId})`} />
      </Svg> : <Image accessible={false} source={source} resizeMode="contain" resizeMethod="resize" style={[styles.image, (id === 'touchstone' || id === 'disney') && styles.monochrome]} />)}
  </View>;
});

const styles = StyleSheet.create({
  logo: { flexShrink: 0, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  monochrome: { tintColor: colors.text },
});
