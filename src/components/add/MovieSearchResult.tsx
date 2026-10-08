import { memo } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Film from 'lucide-react-native/icons/film';
import { AppText } from '../ui';
import { colors, controls, radius, spacing } from '../../theme';
import { movieLayout } from '../../theme/media';
import type { MovieSearchCandidate } from '../../types/movieSearch';

interface MovieSearchResultProps {
  movie: MovieSearchCandidate;
  onPress: (id: string) => void;
}

export const MovieSearchResult = memo(function MovieSearchResult({ movie, onPress }: MovieSearchResultProps) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={[movie.title, movie.year, movie.director].filter((value) => value != null).join(', ')} onPress={() => onPress(movie.id)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.poster}>
        {movie.posterUrl ? <Image source={{ uri: movie.posterUrl }} resizeMode="cover" resizeMethod="resize" style={StyleSheet.absoluteFill} /> : <Film size={controls.iconSize} color={colors.textMuted} />}
      </View>
      <View style={styles.metadata}>
        <AppText variant="searchResultTitle" numberOfLines={2}>{movie.title}</AppText>
        <AppText variant="originalTitle" color="textSecondary" numberOfLines={2}>{movie.originalTitle}</AppText>
        {(movie.year !== null || movie.director) && <AppText variant="caption" color="textMuted" numberOfLines={3}>{[movie.year, movie.director].filter((value) => value != null).join(' · ')}</AppText>}
      </View>
      <ChevronRight size={controls.iconSize} color={colors.textMuted} />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  poster: { width: spacing.xl * 2, aspectRatio: movieLayout.posterAspectRatio, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  metadata: { flex: 1, minWidth: 0, gap: spacing.xs },
  pressed: { opacity: controls.pressedOpacity },
});
