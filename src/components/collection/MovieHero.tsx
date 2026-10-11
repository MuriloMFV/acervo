import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import Film from 'lucide-react-native/icons/film';
import { AppText, Badge } from '../ui';
import { colors, controls, radius, spacing } from '../../theme';
import { movieLayout } from '../../theme/media';
import type { MovieDetailsPreview } from '../../types/collectionDetails';
import { formatRuntime } from '../../utils/collectionDetails';
import { EditionCoverFlip } from './EditionCoverFlip';

export function MovieHero({ movie, backCover }: { movie: MovieDetailsPreview; backCover?: ImageSourcePropType | null }) {
  return (
    <View>
      <View style={styles.backdrop}>
        {movie.backdrop ? <Image source={movie.backdrop} resizeMode="cover" resizeMethod="resize" style={styles.image} /> : <Film size={controls.iconSize} color={colors.textMuted} />}
        <View pointerEvents="none" style={styles.shade} />
        <Svg accessible={false} pointerEvents="none" width="100%" height="100%" style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id="movieBackdropFade" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0" stopColor={colors.background} stopOpacity={0} />
              <Stop offset="0.4" stopColor={colors.background} stopOpacity={0} />
              <Stop offset="0.65" stopColor={colors.background} stopOpacity={0.3} />
              <Stop offset="0.85" stopColor={colors.background} stopOpacity={0.75} />
              <Stop offset="1" stopColor={colors.background} stopOpacity={1} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#movieBackdropFade)" />
        </Svg>
      </View>
      <View style={styles.content}>
        <View style={styles.heroRow}>
          <EditionCoverFlip front={movie.poster} back={backCover} title={movie.title} style={styles.poster} />
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
  poster: { width: '39%', aspectRatio: movieLayout.posterAspectRatio, borderRadius: radius.md, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  metadata: { flex: 1, gap: spacing.sm, paddingVertical: spacing.md },
  genres: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
