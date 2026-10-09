import { StyleSheet, View } from 'react-native';
import { AssetIcon, MediaFormatIcon } from '../visual/AssetIcon';
import { AppText } from '../ui';
import { ActionButton } from '../ui/ActionButton';
import { discCountLabel } from '../../services/collection/editionEditing';
import { MediaFormatBadge } from '../movie';
import { mediaFormatLabels } from '../movie/MediaFormatBadge';
import { colors, controls, radius, spacing } from '../../theme';
import type { CollectionItemDetailsPreview } from '../../types/collectionDetails';
import { conditionLabels, packagingLabels, formatPurchaseDate, formatPurchasePrice } from '../../utils/collectionDetails';

export function EditionDetails({ item, special = false, limited = false, onEdit }: { item: CollectionItemDetailsPreview; special?: boolean; limited?: boolean; onEdit?: () => void }) {
  const { edition, copy } = item;
  const fields = [
    { label: 'Formato', value: mediaFormatLabels[edition.mediaFormat] },
    { label: 'Região', value: edition.region ?? '—' },
    { label: 'País', value: edition.country ?? '—' },
    { label: 'Distribuidora', value: edition.publisher ?? '—' },
    { label: 'Código de barras', value: edition.barcode ?? '—' },
    ...(edition.packagingType ? [{ label: 'Embalagem', value: packagingLabels[edition.packagingType] }] : []),
    ...(edition.editionName ? [{ label: 'Edição', value: edition.editionName }] : []),
    ...(edition.discCount != null ? [{ label: 'Discos', value: discCountLabel(edition.discCount)! }] : []),
  ];
  const copyFields = [
    { label: 'Condição', value: conditionLabels[copy.condition], accent: true },
    { label: 'Aquisição', value: formatPurchaseDate(copy.purchaseDate) },
    { label: 'Preço pago', value: formatPurchasePrice(copy.purchasePrice), accent: true },
    ...(copy.purchasePlace ? [{ label: 'Local da compra', value: copy.purchasePlace }] : []),
    ...(copy.notes ? [{ label: 'Observações', value: copy.notes }] : []),
  ];
  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <AssetIcon name="dvd-disc" size={controls.iconSize} />
        <AppText variant="heading" style={styles.title}>Minha edição</AppText>
        <MediaFormatBadge mediaFormat={edition.mediaFormat} />
      </View>
      {(special || limited) && <View style={styles.heading}><AssetIcon name="limited-edition" /><AppText variant="caption" color="textSecondary">{special && limited ? 'Edição especial · limitada' : limited ? 'Edição limitada' : 'Edição especial'}</AppText></View>}
      <View style={styles.grid}>
        {fields.map((field) => (
          <View key={field.label} style={styles.cell} accessible={field.label === 'Formato' || undefined} accessibilityLabel={field.label === 'Formato' ? `Formato: ${field.value}` : undefined}>
            <AppText variant="caption" color="textMuted">{field.label.toLocaleUpperCase('pt-BR')}</AppText>
            {field.label === 'Formato' ? <MediaFormatIcon format={edition.mediaFormat} color={colors.text} /> : <AppText variant="label" color={'accent' in field && field.accent ? 'accent' : 'text'}>{field.value}</AppText>}
          </View>
        ))}
      </View>
      {onEdit && <ActionButton secondary label="Editar edição" onPress={onEdit} />}
      <AppText variant="heading">Minha cópia</AppText>
      <View style={styles.grid}>
        {copyFields.map(field => <View key={field.label} style={styles.cell}>
          <AppText variant="caption" color="textMuted">{field.label.toLocaleUpperCase('pt-BR')}</AppText>
          <AppText variant="label" color={'accent' in field && field.accent ? 'accent' : 'text'}>{field.value}</AppText>
        </View>)}
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
