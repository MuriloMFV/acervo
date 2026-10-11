import { StyleSheet, View } from 'react-native';
import Disc3 from 'lucide-react-native/icons/disc-3';
import { AssetIcon, MediaFormatIcon } from '../visual/AssetIcon';
import { AppText } from '../ui';
import { ActionButton } from '../ui/ActionButton';
import { CountryDisplay } from '../ui/CountryDisplay';
import { VideoStandardDisplay } from '../ui/VideoStandardDisplay';
import { DistributorDisplay } from '../ui/DistributorDisplay';
import { regionEncodingDraft } from '../../utils/videoStandard';
import { discCountLabel } from '../../services/collection/editionEditing';
import { MediaFormatBadge } from '../movie';
import { mediaFormatLabels } from '../movie/MediaFormatBadge';
import { colors, controls, radius, spacing } from '../../theme';
import type { CollectionItemDetailsPreview } from '../../types/collectionDetails';
import { conditionLabels, packagingLabels, formatPurchaseDate, formatPurchasePrice } from '../../utils/collectionDetails';

export function EditionDetails({ item, special = false, limited = false, onEdit }: { item: CollectionItemDetailsPreview; special?: boolean; limited?: boolean; onEdit?: () => void }) {
  const { edition, copy } = item;
  const regionEncoding = regionEncodingDraft(edition.region ?? '', edition.videoStandard);
  const discCount = edition.discCount ?? 0;
  // Keep very large box sets from creating an unbounded list of SVGs.
  const visibleDiscCount = Math.min(discCount, 32);
  const fields = [
    { label: 'Formato', value: mediaFormatLabels[edition.mediaFormat] },
    { label: 'Região', value: regionEncoding.region || '—' },
    { label: 'Codificação', value: regionEncoding.videoStandard ?? '—' },
    { label: 'País', value: edition.country ?? '—' },
    { label: 'Distribuidora', value: edition.publisher ?? '—' },
    { label: 'Código de barras', value: edition.barcode ?? '—' },
    ...(edition.packagingType ? [{ label: 'Tipo de capa', value: packagingLabels[edition.packagingType] }] : []),
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
          <View key={field.label} style={styles.cell} accessible={field.label === 'Formato' || field.label === 'Discos' || undefined} accessibilityLabel={field.label === 'Formato' || field.label === 'Discos' ? `${field.label}: ${field.value}` : undefined}>
            <AppText variant="caption" color="textMuted">{field.label.toLocaleUpperCase('pt-BR')}</AppText>
            {field.label === 'Formato' ? <MediaFormatIcon format={edition.mediaFormat} color={colors.text} /> : field.label === 'País' ? <CountryDisplay value={edition.country} /> : field.label === 'Codificação' ? <VideoStandardDisplay value={regionEncoding.videoStandard} /> : field.label === 'Distribuidora' ? <DistributorDisplay value={edition.publisher} /> : field.label === 'Discos' ? (
              <View style={styles.discs}>
                {Array.from({ length: visibleDiscCount }, (_, index) => (
                  <Disc3 key={index} size={controls.iconSize} color={colors.text} accessible={false} />
                ))}
                {discCount > visibleDiscCount && <AppText variant="caption" color="textSecondary">+{discCount - visibleDiscCount}</AppText>}
                <AppText variant="label">{discCount}</AppText>
              </View>
            ) : <AppText variant="label" color={'accent' in field && field.accent ? 'accent' : 'text'}>{field.value}</AppText>}
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
  discs: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm },
});
