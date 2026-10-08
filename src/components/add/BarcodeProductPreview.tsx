import { StyleSheet, View } from 'react-native';
import { AppText } from '../ui';
import { EditionImage } from './EditionImage';
import type { EditionCandidate } from '../../types/barcode';
import { spacing } from '../../theme';

export function BarcodeProductPreview({ product }: { product: EditionCandidate }) {
  return <View style={styles.content}>
    <EditionImage key={product.primaryImageUrl} uri={product.primaryImageUrl} label="Imagem sugerida da edição" />
    {product.primaryImageUrl && <AppText variant="caption" color="textMuted">Capa sugerida</AppText>}
    <AppText variant="heading">{product.title ?? 'Edição encontrada'}</AppText>
    <AppText variant="caption" color="textMuted">{product.barcode}</AppText>
    {product.brand && <AppText color="textSecondary">Marca: {product.brand}</AppText>}
    {product.description && <AppText color="textMuted" numberOfLines={3}>{product.description}</AppText>}
  </View>;
}
const styles = StyleSheet.create({ content: { gap: spacing.md } });
