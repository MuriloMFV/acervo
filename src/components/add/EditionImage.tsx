import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Film from 'lucide-react-native/icons/film';
import { colors, controls, radius, spacing } from '../../theme';
import { movieLayout } from '../../theme/media';

export function EditionImage({ uri, fallback, label }: { uri: string | null; fallback?: string | null; label: string }) {
  const [failed, setFailed] = useState(false);
  const [fallbackFailed, setFallbackFailed] = useState(false);
  const image = !failed && uri ? uri : !fallbackFailed && fallback !== uri ? fallback : null;
  return <View style={styles.image}>{image ? <Image key={image} accessibilityLabel={label} source={{ uri: image }} resizeMode="contain" resizeMethod="resize" style={StyleSheet.absoluteFill} onError={() => { if (image === uri && !failed) setFailed(true); else setFallbackFailed(true); }} /> : <Film size={controls.iconSize} color={colors.textMuted} />}</View>;
}
const styles = StyleSheet.create({ image: { width: spacing.xl * 4, aspectRatio: movieLayout.posterAspectRatio, backgroundColor: colors.surface, borderRadius: radius.md, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' } });
