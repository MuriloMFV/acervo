import { memo } from 'react';
import Film from 'lucide-react-native/icons/film';
import { Image, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { colors, controls, radius, spacing, typography } from '../../theme';
import { movieLayout } from '../../theme/media';
import type { CollectionPreviewItem } from '../../types/collectionPreview';
import { AppText } from '../ui/AppText';
import { MediaFormatBadge, mediaFormatLabels } from './MediaFormatBadge';

export interface MovieCardProps {
  item: CollectionPreviewItem;
  width: number;
  onPress?: (id: string) => void;
}

export const MovieCard = memo(function MovieCard({ item, width, onPress }: MovieCardProps) {
  const { fontScale } = useWindowDimensions();
  return (
    <Pressable
      accessible
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={() => onPress?.(item.id)}
      accessibilityLabel={`${item.title}, ${item.year}, ${mediaFormatLabels[item.mediaFormat]}`}
      style={({ pressed }) => [styles.card, { width }, pressed && { opacity: controls.pressedOpacity }]}
    >
      <View style={styles.poster}>
        {item.poster ? (
          <Image source={item.poster} style={styles.image} resizeMode="cover" resizeMethod="resize" accessible={false} />
        ) : (
          <View style={styles.placeholder}>
            <Film size={controls.iconSize} color={colors.textMuted} />
          </View>
        )}
        <View style={styles.badge}>
          <MediaFormatBadge mediaFormat={item.mediaFormat} />
        </View>
      </View>
      <View style={styles.metadata}>
        <AppText
          variant="movieTitle"
          numberOfLines={movieLayout.titleLines}
          ellipsizeMode="tail"
          style={{ height: typography.movieTitle.lineHeight * movieLayout.titleLines * fontScale }}
        >
          {item.title}
        </AppText>
        <AppText variant="caption" color="textMuted">{item.year ?? '—'}</AppText>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: { borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surfaceElevated },
  poster: { width: '100%', aspectRatio: movieLayout.posterAspectRatio, backgroundColor: colors.surface },
  image: { width: '100%', height: '100%' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: spacing.xs, right: spacing.xs, maxWidth: '100%' },
  metadata: { padding: spacing.xs, gap: spacing.xs },
});
