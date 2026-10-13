import { memo } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Film from 'lucide-react-native/icons/film';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { AppText } from '../ui/AppText';
import { mediaFormatLabels } from './MediaFormatBadge';
import { colors, controls, radius, spacing } from '../../theme';
import { movieLayout } from '../../theme/media';
import type { CollectionPreviewItem } from '../../types/collectionPreview';

export const MovieListRow = memo(function MovieListRow({ item, onPress }: {
  item: CollectionPreviewItem;
  onPress?: (id: string) => void;
}) {
  return <Pressable
    accessible
    accessibilityRole={onPress ? 'button' : undefined}
    accessibilityLabel={[item.title, item.year, mediaFormatLabels[item.mediaFormat], item.editionLabel, item.kind === 'box' ? `Box, ${item.movieCount} filmes` : null].filter(value => value != null).join(', ')}
    disabled={!onPress}
    onPress={() => onPress?.(item.id)}
    style={({ pressed }) => [styles.row, pressed && styles.pressed]}
  >
    <View style={styles.poster}>
      {item.poster
        ? <Image source={item.poster} resizeMode="contain" resizeMethod="resize" style={styles.image} accessible={false} />
        : <Film size={controls.iconSize} color={colors.textMuted} />}
    </View>
    <View style={styles.metadata}>
      <AppText variant="movieTitle" numberOfLines={2} ellipsizeMode="tail">{item.title}</AppText>
      <View style={styles.format}>
        <AppText variant="caption" color="textMuted">{item.year ?? '—'}</AppText>
      </View>
      {!!item.editionLabel && <AppText variant="caption" color="textSecondary" numberOfLines={2} ellipsizeMode="tail">{item.editionLabel}</AppText>}
      {item.kind === 'box' && <AppText variant="caption" color="textMuted">{item.movieCount} filmes</AppText>}
    </View>
    {onPress && <ChevronRight size={controls.iconSize} color={colors.textMuted} />}
  </Pressable>;
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surfaceElevated },
  pressed: { opacity: controls.pressedOpacity },
  poster: { width: spacing.xl * 2, aspectRatio: movieLayout.posterAspectRatio, flexShrink: 0, overflow: 'hidden', borderRadius: radius.sm, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
  metadata: { flex: 1, minWidth: 0, gap: spacing.xs },
  format: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
});
