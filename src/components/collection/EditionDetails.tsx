import { StyleSheet, View } from 'react-native';
import Disc3 from 'lucide-react-native/icons/disc-3';
import { AppText } from '../ui';
import { MediaFormatBadge } from '../movie';
import { mediaFormatLabels } from '../movie/MediaFormatBadge';
import { colors, controls, radius, spacing } from '../../theme';
import type { CollectionItemDetailsPreview } from '../../types/collectionDetails';
import { conditionLabels, packagingLabels, formatPurchaseDate, formatPurchasePrice } from '../../utils/collectionDetails';

export function EditionDetails({ item }: { item: CollectionItemDetailsPreview }) {
  const { edition, copy } = item;
  const fields = [
    { label: 'Formato', value: mediaFormatLabels[edition.mediaFormat] },
    { label: 'Região', value: edition.region ?? '—' },
    { label: 'País', value: edition.country ?? '—' },
    { label: 'Distribuidora', value: edition.publisher ?? '—' },
    { label: 'Condição', value: conditionLabels[copy.condition], accent: true },
    { label: 'Aquisição', value: formatPurchaseDate(copy.purchaseDate) },
    { label: 'Preço pago', value: formatPurchasePrice(copy.purchasePrice), accent: true },
    { label: 'Código de barras', value: edition.barcode ?? '—' },
    ...(edition.packagingType ? [{ label: 'Embalagem', value: packagingLabels[edition.packagingType] }] : []),
    ...(edition.editionName ? [{ label: 'Edição', value: edition.editionName }] : []),
    ...(copy.purchasePlace ? [{ label: 'Local da compra', value: copy.purchasePlace }] : []),
    ...(copy.notes ? [{ label: 'Observações', value: copy.notes }] : []),
  ];
  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <Disc3 size={controls.iconSize} color={colors.accent} />
        <AppText variant="heading" style={styles.title}>Minha edição</AppText>
        <MediaFormatBadge mediaFormat={edition.mediaFormat} />
      </View>
      <View style={styles.grid}>
        {fields.map((field) => (
          <View key={field.label} style={styles.cell}>
            <AppText variant="caption" color="textMuted">{field.label.toLocaleUpperCase('pt-BR')}</AppText>
            <AppText variant="label" color={'accent' in field && field.accent ? 'accent' : 'text'}>{field.value}</AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  heading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
  title: { flexGrow: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cell: { flexBasis: '47%', flexGrow: 1, borderRadius: radius.md, backgroundColor: colors.surface, padding: spacing.md, gap: spacing.sm },
});
