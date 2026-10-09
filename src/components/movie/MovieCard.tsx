import { memo } from 'react';
import Film from 'lucide-react-native/icons/film';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { colors, controls, radius, spacing } from '../../theme';
import { movieLayout } from '../../theme/media';
import type { CollectionPreviewItem } from '../../types/collectionPreview';
import { AppText } from '../ui/AppText';
import { Badge } from '../ui/Badge';
import { MediaFormatBadge, mediaFormatLabels } from './MediaFormatBadge';

export interface MovieCardProps {
  item: CollectionPreviewItem;
  width: number;
  onPress?: (id: string) => void;
}

export const MovieCard = memo(function MovieCard({ item, width, onPress }: MovieCardProps) {
  return (
    <Pressable
      accessible
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={() => onPress?.(item.id)}
      accessibilityLabel={[item.title, item.year, mediaFormatLabels[item.mediaFormat], item.kind === 'box' ? `Box, ${item.movieCount} filmes` : null].filter(value => value != null).join(', ')}
      style={({ pressed }) => [{ width }, pressed && { opacity: controls.pressedOpacity }]}
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
          {item.kind === 'box' ? <Badge label="BOX" tone="accent" /> : <MediaFormatBadge mediaFormat={item.mediaFormat} />}
        </View>
      </View>
      <View style={styles.metadata}>
        <AppText
          variant="movieTitle"
          numberOfLines={movieLayout.titleLines}
          ellipsizeMode="tail"
          style={styles.title}
        >
          {item.title}
        </AppText>
        {item.kind === 'box' && <AppText variant="caption" color="textMuted" style={styles.title}>{item.movieCount} filmes</AppText>}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  poster: { width: '100%', aspectRatio: movieLayout.posterAspectRatio, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surface },
  image: { width: '100%', height: '100%' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: spacing.xs, right: spacing.xs, maxWidth: '100%' },
  metadata: { paddingTop: spacing.xs, paddingHorizontal: spacing.xs },
  title: { textAlign: 'center' },
});
