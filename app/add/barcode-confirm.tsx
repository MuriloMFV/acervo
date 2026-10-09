import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import { AppText, IconButton, Screen } from '../../src/components/ui';
import { ActionButton } from '../../src/components/ui/ActionButton';
import { BarcodeConfirmation } from '../../src/components/add/BarcodeConfirmation';
import { useBarcodeWebSelection } from '../../src/hooks/useBarcodeWebSelection';
import { useBarcodeLookup } from '../../src/hooks/useBarcodeLookup';
import { queryKeys } from '../../src/lib/queryClient';
import { getMovieDetails } from '../../src/services/tmdb';
import { isValidBarcode } from '../../src/utils/barcode';
import { colors, controls, spacing } from '../../src/theme';

export default function BarcodeConfirmationScreen() {
  const params = useLocalSearchParams<{ code?: string; id?: string; webId?: string }>();
  const code = typeof params.code === 'string' ? params.code : '';
  const id = typeof params.id === 'string' ? params.id : '';
  const validId = /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id));
  const lookup = useBarcodeLookup(code);
  const webCandidate = useBarcodeWebSelection(code, params.webId);
  const known = lookup.data?.source === 'SUPABASE' ? lookup.data.edition : null;
  const movie = useQuery({ queryKey: queryKeys.movie(id), queryFn: ({ signal }) => getMovieDetails(id, signal), enabled: validId && !!lookup.data && !known, staleTime: 300_000 });
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  return <Screen>
    <View style={styles.header}><IconButton accessibilityLabel="Voltar" disabled={saving} onPress={() => router.canGoBack() ? router.back() : router.replace('/add/barcode')}><ArrowLeft size={controls.iconSize} color={colors.textSecondary} /></IconButton><AppText variant="heading">Confirmar edição</AppText></View>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      {!isValidBarcode(code) || (!known && !validId) ? <AppText color="textMuted">Código ou filme inválido</AppText> : !lookup.isError && (lookup.isPending || (!known && movie.isPending)) ? <ActivityIndicator accessibilityLabel="Carregando edição" color={colors.accent} /> : null}
      {lookup.isError ? <><AppText color="textMuted">Não foi possível consultar agora</AppText><ActionButton label="Tentar novamente" onPress={() => { void lookup.refetch(); }} /></> : known ? <BarcodeConfirmation key={known.id} barcode={code} knownEdition={known} onBusyChange={setSaving} /> : movie.isError ? <><AppText color="textMuted">Não foi possível carregar o filme</AppText><ActionButton label="Tentar novamente" onPress={() => { void movie.refetch(); }} /></> : movie.data && lookup.data ? <BarcodeConfirmation key={`${code}:${id}`} barcode={code} webCandidate={webCandidate} movie={movie.data} candidate={lookup.data.source === 'UPCITEMDB' ? lookup.data.candidate : null} onBusyChange={setSaving} /> : null}
    </ScrollView>
  </Screen>;
}
const styles = StyleSheet.create({ header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md }, content: { gap: spacing.md, paddingBottom: spacing.xl } });
