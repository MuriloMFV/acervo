import { useState } from 'react';
import { Modal, StyleSheet, Switch, View } from 'react-native';
import { AppText } from '../ui';
import { ActionButton } from '../ui/ActionButton';
import { FormField } from '../ui/FormField';
import { CountrySelector } from '../ui/CountrySelector';
import { DistributorSelector } from '../ui/DistributorSelector';
import { RegionSelector } from '../ui/RegionSelector';
import { PackagingSelector } from './PackagingSelector';
import { BarcodeScanner } from '../barcode/BarcodeScanner';
import { applyScannedEditionBarcode, type EditionFormValues } from '../../services/collection/editionEditing';
import type { MediaFormat } from '../../services/supabase/types';
import { colors, spacing } from '../../theme';

export type EditionMetadataValues = EditionFormValues & { isSpecialEdition?: boolean; isLimitedEdition?: boolean };

export function EditionMetadataFields({ values, mediaFormat, onChange, disabled = false }: {
  values: EditionMetadataValues; mediaFormat: MediaFormat;
  onChange: (changes: Partial<EditionMetadataValues>) => void; disabled?: boolean;
}) {
  const [scannerOpen, setScannerOpen] = useState(false);
  const field = (key: 'editionName' | 'publisher' | 'country' | 'region' | 'discCount' | 'barcode') => (text: string) => onChange({ [key]: text });
  return <View style={styles.fields}>
    <FormField label="Nome da edição" value={values.editionName} onChangeText={field('editionName')} editable={!disabled} maxLength={200} />
    <FormField label="Código de barras" value={values.barcode ?? ''} onChangeText={field('barcode')} keyboardType="number-pad" autoCapitalize="none" autoCorrect={false} editable={!disabled} />
    <ActionButton secondary label="Escanear código de barras" disabled={disabled} onPress={() => setScannerOpen(true)} />
    <PackagingSelector value={values.packagingType ?? 'STANDARD'} onChange={packagingType => onChange({ packagingType })} disabled={disabled} />
    <DistributorSelector value={values.publisher} onChange={field('publisher')} disabled={disabled} />
    <CountrySelector value={values.country} onChange={field('country')} disabled={disabled} />
    <RegionSelector value={values.region} videoStandard={values.videoStandard ?? null} mediaFormat={mediaFormat} onChange={onChange} disabled={disabled} />
    <FormField label="Quantidade de discos" value={values.discCount} onChangeText={field('discCount')} keyboardType="number-pad" editable={!disabled} />
    {values.isSpecialEdition !== undefined && <View style={styles.toggle}>
      <AppText variant="label" style={styles.label}>Edição especial</AppText>
      <Switch accessibilityLabel="Edição especial" value={values.isSpecialEdition} disabled={disabled} onValueChange={isSpecialEdition => onChange({ isSpecialEdition })} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.text} />
    </View>}
    {values.isLimitedEdition !== undefined && <View style={styles.toggle}>
      <AppText variant="label" style={styles.label}>Edição limitada</AppText>
      <Switch accessibilityLabel="Edição limitada" value={values.isLimitedEdition} disabled={disabled} onValueChange={isLimitedEdition => onChange({ isLimitedEdition })} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.text} />
    </View>}
    {scannerOpen && <Modal animationType="slide" onRequestClose={() => setScannerOpen(false)}>
      <BarcodeScanner onScan={code => {
        const scanned = applyScannedEditionBarcode(values, code);
        if (scanned !== values) onChange({ barcode: scanned.barcode });
        setScannerOpen(false);
      }} onClose={() => setScannerOpen(false)} onManual={() => setScannerOpen(false)} />
    </Modal>}
  </View>;
}

const styles = StyleSheet.create({
  fields: { gap: spacing.md },
  toggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  label: { flex: 1 },
});
