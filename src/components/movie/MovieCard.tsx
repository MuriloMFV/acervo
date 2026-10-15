import { TouchSurface as Pressable } from '../ui/TouchSurface';
import { memo, useState } from 'react';
import Film from 'lucide-react-native/icons/film';
import { Image, StyleSheet, View, useWindowDimensions, type ImageLoadEvent } from 'react-native';
import { colors, controls, radius, spacing, typography } from '../../theme';
import { movieLayout } from '../../theme/media';
import type { CollectionPreviewItem } from '../../types/collectionPreview';
import { AppText } from '../ui/AppText';
import { mediaFormatLabels } from './MediaFormatBadge';

export interface MovieCardProps {
  item: CollectionPreviewItem;
  width: number;
  onPress?: (id: string) => void;
}

function CoverArtwork({ item, width }: Pick<MovieCardProps, 'item' | 'width'>) {
  const [aspectRatio, setAspectRatio] = useState<number>(movieLayout.posterAspectRatio);
  const [failed, setFailed] = useState(false);
  // Keep the grid's existing space while preserving the artwork's proportions.
  const frameHeight = width / movieLayout.posterAspectRatio;
  const coverWidth = Math.min(width, frameHeight * aspectRatio);
  const coverHeight = coverWidth / aspectRatio;
  const onLoad = ({ nativeEvent: { source } }: ImageLoadEvent) => {
    const ratio = source.width / source.height;
    if (source.width > 0 && source.height > 0 && Number.isFinite(ratio)) setAspectRatio(ratio);
  };

  return <View style={styles.poster}>
    <View style={[styles.artwork, { width: coverWidth, height: coverHeight }, (!item.poster || failed) && styles.placeholder]}>
      {item.poster && !failed
        ? <Image source={item.poster} style={styles.image} resizeMode="contain" resizeMethod="resize" accessible={false} onLoad={onLoad} onError={() => setFailed(true)} />
        : <Film size={controls.iconSize} color={colors.textMuted} />}
    </View>
  </View>;
}

export const MovieCard = memo(function MovieCard({ item, width, onPress }: MovieCardProps) {
  const { fontScale } = useWindowDimensions();
  return (
    <Pressable
      accessible
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={() => onPress?.(item.id)}
      accessibilityLabel={[item.title, item.year, mediaFormatLabels[item.mediaFormat], item.kind === 'box' ? `Box, ${item.movieCount} filmes` : null].filter(value => value != null).join(', ')}
      style={({ pressed }) => [{ width }, pressed && { opacity: controls.pressedOpacity }]}
    >
      <CoverArtwork key={JSON.stringify(item.poster)} item={item} width={width} />
      <View style={styles.metadata}>
        <AppText
          variant="movieTitle"
          numberOfLines={movieLayout.titleLines}
          ellipsizeMode="tail"
          style={[styles.title, { minHeight: typography.movieTitle.lineHeight * movieLayout.titleLines * fontScale }]}
        >
          {item.title}
        </AppText>
        <AppText variant="caption" color="textMuted" style={styles.title}>{[item.year, mediaFormatLabels[item.mediaFormat]].filter(value => value != null).join(' · ')}</AppText>
        {item.kind === 'box' && <AppText variant="caption" color="textMuted" style={styles.title}>{item.movieCount} filmes</AppText>}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  poster: { width: '100%', aspectRatio: movieLayout.posterAspectRatio, alignItems: 'center', justifyContent: 'center' },
  artwork: { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, borderRadius: radius.sm, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
  placeholder: { backgroundColor: colors.surface },
  metadata: { gap: spacing.xs, paddingTop: spacing.sm },
  title: { textAlign: 'left' },
});
