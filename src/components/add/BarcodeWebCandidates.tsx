import { Image, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../ui';
import type { BarcodeWebCandidate } from '../../types/barcodeWeb';
import { colors, radius, spacing } from '../../theme';

export function BarcodeWebCandidates({ candidates, onSelect }: { candidates: BarcodeWebCandidate[]; onSelect: (id: string) => void }) {
  return <View style={styles.list}>
    <AppText variant="heading">Possíveis edições</AppText>
    {candidates.map((candidate) => <Pressable key={candidate.id} accessibilityRole="button" accessibilityLabel={`Selecionar ${candidate.title}`} onPress={() => onSelect(candidate.id)} style={styles.card}>
      {candidate.imageUrl && <Image source={{ uri: candidate.imageUrl }} accessibilityLabel={candidate.title} resizeMode="contain" style={styles.thumbnail} />}
      <View style={styles.text}>
        <AppText variant="label">{candidate.title}</AppText>
        {!!candidate.snippet && <AppText variant="caption" color="textSecondary" numberOfLines={3}>{candidate.snippet}</AppText>}
        <AppText variant="caption" color="textMuted">{candidate.sourceDomain}</AppText>
      </View>
    </Pressable>)}
  </View>;
}
const styles = StyleSheet.create({
  list: { gap: spacing.md },
  card: { flexDirection: 'row', gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface },
  thumbnail: { width: 64, height: 96 },
  text: { flex: 1, gap: spacing.sm },
});
