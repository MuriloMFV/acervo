import { useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { ActionButton } from '../ui/ActionButton';
import { FormField } from '../ui/FormField';
import { CountrySelector } from '../ui/CountrySelector';
import { DistributorSelector } from '../ui/DistributorSelector';
import { RegionSelector } from '../ui/RegionSelector';
import { PackagingSelector } from './PackagingSelector';
import { BarcodeScanner } from '../barcode/BarcodeScanner';
import { applyScannedEditionBarcode, type EditionFormValues } from '../../services/collection/editionEditing';
import type { MediaFormat } from '../../services/supabase/types';
import { spacing } from '../../theme';

export type EditionMetadataValues = EditionFormValues;

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
});
