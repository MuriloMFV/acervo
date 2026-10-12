import { StyleSheet, View } from 'react-native';
import LibraryBig from 'lucide-react-native/icons/library-big';
import Banknote from 'lucide-react-native/icons/banknote';
import { AppText } from '../ui';
import { colors, controls, radius, spacing } from '../../theme';
import type { CollectionStats, FrequentValue } from '../../types/collectionStats';
import type { MediaFormat } from '../../services/supabase/types';
import { mediaFormatLabels } from '../movie/MediaFormatBadge';
import { formatPurchasePrice } from '../../utils/collectionDetails';

const formats: MediaFormat[] = ['UHD_4K', 'BLURAY', 'DVD', 'VHS'];
function FrequentCard({ label, value, wide = false }: { label: string; value: FrequentValue | null; wide?: boolean }) {
  return <View style={[styles.card, styles.frequent, wide && styles.wide]}>
    <AppText variant="caption" color="textMuted">{label}</AppText>
    <AppText variant="heading">{value?.label ?? '—'}</AppText>
    {value && <AppText variant="caption" color="textSecondary">{value.count} {value.count === 1 ? 'filme' : 'filmes'}</AppText>}
  </View>;
}
export function CollectionStatistics({ stats }: { stats: CollectionStats }) {
  return <View style={styles.section}>
    <View style={styles.heading}><AppText variant="heading" style={styles.title}>Estatísticas</AppText><AppText variant="caption" color="textMuted">VISÃO GERAL</AppText></View>
    <View style={[styles.card, styles.total]}><View style={styles.title}><AppText variant="caption" color="textMuted">ITENS FÍSICOS TOTAIS</AppText><View style={styles.numberRow}><AppText variant="title" color="accent">{stats.total}</AppText><AppText variant="caption" color="textSecondary">itens</AppText></View></View><LibraryBig size={controls.iconSize + spacing.sm} color={colors.accent} /></View>
    <View style={styles.frequencies}>
      <View style={[styles.card, styles.frequent]}><AppText variant="caption" color="textMuted">FILMES INDIVIDUAIS</AppText><AppText variant="heading">{stats.individualMovies}</AppText></View>
      <View style={[styles.card, styles.frequent]}><AppText variant="caption" color="textMuted">BOXES</AppText><AppText variant="heading">{stats.boxes}</AppText></View>
      <View style={[styles.card, styles.wide]}><AppText variant="caption" color="textMuted">TOTAL DE FILMES NO ACERVO</AppText><AppText variant="heading" color="accent">{stats.totalMovies}</AppText><AppText variant="caption" color="textSecondary">Inclui os filmes dentro dos boxes</AppText></View>
    </View>
    <View style={styles.formats}>{formats.map((format) => <View key={format} style={[styles.card, styles.format]}><AppText variant="caption" color="textMuted">{mediaFormatLabels[format].toLocaleUpperCase('pt-BR')}</AppText><AppText variant="heading">{stats.formats[format]}</AppText><AppText variant="caption" color="accent">{(stats.total ? stats.formats[format] / stats.total * 100 : 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</AppText></View>)}</View>
    <View style={styles.frequencies}><FrequentCard label="GÊNERO MAIS PRESENTE" value={stats.genre} /><FrequentCard label="DÉCADA MAIS PRESENTE" value={stats.decade} /><FrequentCard label="DIRETOR MAIS PRESENTE" value={stats.director} wide /></View>
    <View style={[styles.card, styles.total]}><Banknote size={controls.iconSize} color={colors.accent} /><View style={styles.title}><AppText variant="caption" color="textMuted">VALOR TOTAL REGISTRADO</AppText><AppText variant="heading" color="accent">{formatPurchasePrice(stats.pricedItems ? stats.registeredValue : null)}</AppText></View></View>
  </View>;
}
const styles = StyleSheet.create({
  section: { gap: spacing.md }, heading: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, title: { flex: 1, gap: spacing.sm },
  card: { padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface, gap: spacing.sm },
  total: { flexDirection: 'row', alignItems: 'center', gap: spacing.md }, numberRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  formats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, format: { flexGrow: 1, flexBasis: '21%', paddingHorizontal: spacing.sm, alignItems: 'center' },
  frequencies: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, frequent: { flexGrow: 1, flexBasis: '46%' }, wide: { flexBasis: '100%' },
});
