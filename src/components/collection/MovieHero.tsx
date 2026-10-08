import { Image, StyleSheet, View } from 'react-native';
import Film from 'lucide-react-native/icons/film';
import { AppText, Badge } from '../ui';
import { colors, controls, radius, spacing } from '../../theme';
import { movieLayout } from '../../theme/media';
import type { MovieDetailsPreview } from '../../types/collectionDetails';
import { formatRuntime } from '../../utils/collectionDetails';

export function MovieHero({ movie }: { movie: MovieDetailsPreview }) {
  return (
    <View>
      <View style={styles.backdrop}>
        {movie.backdrop ? <Image source={movie.backdrop} resizeMode="cover" resizeMethod="resize" style={styles.image} /> : <Film size={controls.iconSize} color={colors.textMuted} />}
        <View style={styles.shade} />
      </View>
      <View style={styles.content}>
        <View style={styles.heroRow}>
          <View style={styles.poster}>
            {movie.poster ? <Image source={movie.poster} resizeMode="cover" resizeMethod="resize" style={styles.image} /> : <Film size={controls.iconSize} color={colors.textMuted} />}
          </View>
          <View style={styles.metadata}>
            <AppText variant="title">{movie.title}</AppText>
            {!!movie.originalTitle && <AppText variant="originalTitle" color="textSecondary">{movie.originalTitle}</AppText>}
            <AppText variant="label">{[movie.year, movie.director || null].filter((value) => value != null).join(' · ') || '—'}</AppText>
            <AppText variant="caption" color="textMuted">{formatRuntime(movie.runtime)}</AppText>
          </View>
        </View>
        <View style={styles.genres}>
          {movie.genres.map((genre) => <Badge key={genre} label={genre} />)}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { aspectRatio: 16 / 9, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
  shade: { ...StyleSheet.absoluteFill, backgroundColor: colors.background, opacity: 0.65 },
  content: { paddingHorizontal: spacing.page, gap: spacing.lg },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: -spacing.xl * 2 },
  poster: { width: '36%', aspectRatio: movieLayout.posterAspectRatio, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surfaceActive, alignItems: 'center', justifyContent: 'center' },
  metadata: { flex: 1, gap: spacing.sm, paddingVertical: spacing.md },
  genres: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
