import { StyleSheet, View } from 'react-native';
import { AppText } from '../ui';
import { colors, spacing } from '../../theme';
import type { CollectionStats, FrequentValue } from '../../types/collectionStats';
import type { MediaFormat } from '../../services/supabase/types';
import { mediaFormatLabels } from '../movie/MediaFormatBadge';
import { formatPurchasePrice } from '../../utils/collectionDetails';

const formats: MediaFormat[] = ['UHD_4K', 'BLURAY', 'DVD', 'VHS'];
function FrequentValueRow({ label, value }: { label: string; value: FrequentValue | null }) {
  return <View style={styles.fact}>
    <AppText variant="caption" color="textMuted">{label}</AppText>
    <View style={styles.factValue}>
      <AppText variant="label" style={styles.flex}>{value?.label ?? '—'}</AppText>
      {value && <AppText variant="caption" color="textMuted">{value.count} {value.count === 1 ? 'filme' : 'filmes'}</AppText>}
    </View>
  </View>;
}
export function CollectionStatistics({ stats }: { stats: CollectionStats }) {
  return <View style={styles.section}>
    <AppText variant="heading">A coleção em números</AppText>
    <View style={styles.total}>
      <AppText variant="display">{stats.total.toLocaleString('pt-BR')}</AppText>
      <AppText variant="caption" color="textMuted">{stats.total === 1 ? 'item físico' : 'itens físicos'}</AppText>
    </View>
    <View style={styles.inventory}>
      <View style={styles.inventoryCell}><AppText variant="heading">{stats.individualMovies}</AppText><AppText variant="caption" color="textMuted">Filmes individuais</AppText></View>
      <View style={styles.inventoryCell}><AppText variant="heading">{stats.boxes}</AppText><AppText variant="caption" color="textMuted">Boxes</AppText></View>
      <View style={styles.inventoryCell}><AppText variant="heading">{stats.totalMovies}</AppText><AppText variant="caption" color="textMuted">Filmes, com os boxes</AppText></View>
    </View>
    <View style={styles.formats}>{formats.map(format => <View key={format} style={styles.format}>
      <View style={styles.factValue}>
        <AppText variant="label" style={styles.flex}>{mediaFormatLabels[format]}</AppText>
        <AppText variant="heading" style={styles.number}>{stats.formats[format]}</AppText>
      </View>
      <AppText variant="caption" color="textMuted">{(stats.total ? stats.formats[format] / stats.total : 0).toLocaleString('pt-BR', { style: 'percent', maximumFractionDigits: 1 })} da coleção</AppText>
    </View>)}</View>
    <View>
      <FrequentValueRow label="Gênero mais presente" value={stats.genre} />
      <FrequentValueRow label="Década mais presente" value={stats.decade} />
      <FrequentValueRow label="Diretor mais presente" value={stats.director} />
    </View>
    <View style={styles.value}>
      <AppText variant="caption" color="textSecondary">Valor total registrado</AppText>
      <AppText variant="title" color="accent">{formatPurchasePrice(stats.pricedItems ? stats.registeredValue : null)}</AppText>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  section: { gap: spacing.lg },
  flex: { flex: 1, minWidth: 0 },
  total: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: spacing.sm },
  inventory: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, paddingBottom: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  inventoryCell: { flex: 1, minWidth: 84, gap: spacing.xs },
  formats: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.lg },
  format: { flexGrow: 1, flexBasis: '43%', paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, gap: spacing.xs },
  fact: { gap: spacing.sm, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  factValue: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: spacing.sm },
  number: { fontVariant: ['tabular-nums'] },
  value: { gap: spacing.sm, borderLeftWidth: 2, borderLeftColor: colors.primary, paddingLeft: spacing.md, paddingVertical: spacing.sm },
});
