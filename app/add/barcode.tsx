import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Keyboard, ScrollView, StyleSheet, View } from 'react-native';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import { AppText, IconButton, Screen } from '../../src/components/ui';
import { FormField } from '../../src/components/ui/FormField';
import { ActionButton } from '../../src/components/ui/ActionButton';
import { BarcodeProductPreview } from '../../src/components/add/BarcodeProductPreview';
import { BarcodeConfirmation } from '../../src/components/add/BarcodeConfirmation';
import { useBarcodeLookup } from '../../src/hooks/useBarcodeLookup';
import { capturedBarcode } from '../../src/utils/barcodeScanner';
import { validatedBarcode } from '../../src/utils/barcode';
import { UpcError } from '../../src/services/upc';
import { colors, controls, spacing } from '../../src/theme';

export default function BarcodeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string | string[] }>();
  const [input, setInput] = useState(() => capturedBarcode(params.code));
  const [code, setCode] = useState(() => capturedBarcode(params.code));
  const [invalid, setInvalid] = useState(false);
  const [saving, setSaving] = useState(false);
  const result = useBarcodeLookup(code);
  const search = () => {
    Keyboard.dismiss();
    try {
      const next = validatedBarcode(input);
      setInvalid(false); setCode(next);
      if (next === code && result.isError) void result.refetch();
    } catch { setCode(''); setInvalid(true); }
  };
  const match = (manual = false) => router.navigate({ pathname: '/add/barcode-match', params: { code, mode: manual ? 'manual' : 'search' } });
  return <Screen>
    <View style={styles.header}><IconButton accessibilityLabel="Voltar" disabled={saving} onPress={() => router.canGoBack() ? router.back() : router.replace('/add')}><ArrowLeft size={controls.iconSize} color={colors.textSecondary} /></IconButton><AppText variant="heading" style={styles.title}>Código de barras</AppText></View>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      <FormField label="EAN / UPC" value={input} editable={!saving} onChangeText={(text) => { setInput(text); setCode(''); setInvalid(false); }} keyboardType="number-pad" autoCorrect={false} onSubmitEditing={search} returnKeyType="search" />
      {invalid && <AppText accessibilityRole="alert" color="textMuted">Código inválido. Use 8, 12 ou 13 dígitos.</AppText>}
      <ActionButton label="Buscar" disabled={saving || !input.trim()} busy={!!code && result.isFetching} onPress={search} />
      {!!code && result.isFetching && !result.data && <AppText variant="caption" color="textMuted" accessibilityLiveRegion="polite">Buscando edição...</AppText>}
      {!!code && result.isError && <><AppText accessibilityRole="alert" color="textMuted">{result.error instanceof UpcError && result.error.kind === 'rate-limit' ? result.error.message : 'Não foi possível consultar agora'}</AppText><ActionButton secondary label="Tentar novamente" onPress={() => { void result.refetch(); }} /></>}
      {!!code && result.data?.source === 'SUPABASE' && <BarcodeConfirmation key={result.data.edition.id} barcode={code} knownEdition={result.data.edition} onBusyChange={setSaving} />}
      {!!code && result.data?.source === 'UPCITEMDB' && <><BarcodeProductPreview product={result.data.candidate} /><ActionButton label="Identificar filme" onPress={() => match()} /></>}
      {!!code && result.data?.source === 'NOT_FOUND' && <><AppText color="textMuted">Nenhuma edição encontrada</AppText><ActionButton label="Buscar filme" onPress={() => match()} /><ActionButton secondary label="Cadastro manual" onPress={() => match(true)} /></>}
    </ScrollView>
  </Screen>;
}
const styles = StyleSheet.create({ header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md }, title: { flex: 1 }, content: { gap: spacing.md, paddingBottom: spacing.xl } });
