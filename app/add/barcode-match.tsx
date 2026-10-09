import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FlatList, Keyboard, StyleSheet, View } from 'react-native';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import { AppText, IconButton, Screen } from '../../src/components/ui';
import { ActionButton } from '../../src/components/ui/ActionButton';
import { VisualFeedback } from '../../src/components/visual/VisualFeedback';
import { MovieSearchField } from '../../src/components/add/MovieSearchField';
import { MovieSearchResult } from '../../src/components/add/MovieSearchResult';
import { useBarcodeLookup } from '../../src/hooks/useBarcodeLookup';
import { useMovieSearch } from '../../src/hooks/useMovieSearch';
import { isValidBarcode, productMovieQuery } from '../../src/utils/barcode';
import { colors, controls, spacing } from '../../src/theme';

export default function BarcodeMovieMatchScreen() {
  const params = useLocalSearchParams<{ code?: string; mode?: string; candidateId?: string }>();
  const code = typeof params.code === 'string' ? params.code : '';
  const lookup = useBarcodeLookup(code);
  const product = lookup.data?.source === 'UPCITEMDB' ? lookup.data.candidate : null;
  const webCandidate = lookup.data?.source === 'WEB' ? lookup.data.candidates.find((item) => item.id === params.candidateId) : null;
  const [query, setQuery] = useState(() => params.mode === 'manual' ? '' : webCandidate?.detectedTitle ?? productMovieQuery(product?.rawProductName ?? null));
  const { results, status, retry } = useMovieSearch(query);
  const router = useRouter();
  return <Screen>
    <View style={styles.header}><IconButton accessibilityLabel="Voltar ao código" onPress={() => router.canGoBack() ? router.back() : router.replace('/add/barcode')}><ArrowLeft size={controls.iconSize} color={colors.textSecondary} /></IconButton><AppText variant="heading" style={styles.title}>{params.mode === 'manual' ? 'Cadastro manual' : 'Buscar filme'}</AppText></View>
    {!isValidBarcode(code) ? <AppText color="textMuted">Código inválido</AppText> : <>
      <AppText variant="caption" color="textMuted">{webCandidate?.title ?? product?.title ?? code}</AppText>
      <MovieSearchField value={query} onChangeText={setQuery} />
      {lookup.isPending && <VisualFeedback animation="barcode" label="Consultando edição" />}
      {lookup.isError && <><AppText color="textMuted">Não foi possível consultar agora</AppText><ActionButton secondary label="Tentar novamente" onPress={() => { void lookup.refetch(); }} /></>}
      <FlatList data={results} keyExtractor={(movie) => movie.id} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" initialNumToRender={8} contentContainerStyle={styles.list} ItemSeparatorComponent={() => <View style={styles.separator} />} renderItem={({ item }) => <MovieSearchResult movie={item} onPress={(id) => { Keyboard.dismiss(); router.navigate({ pathname: '/add/barcode-confirm', params: { code, id, candidateId: webCandidate?.id } }); }} />} ListEmptyComponent={status === 'loading' ? <VisualFeedback animation="search" label="Buscando filmes" /> : status === 'error' ? <AppText color="textMuted">Não foi possível buscar agora</AppText> : status === 'success' ? <VisualFeedback animation="film" loop={false} label="Nenhum filme encontrado" /> : null} ListFooterComponent={status === 'error' ? <ActionButton secondary label="Tentar novamente" onPress={retry} /> : null} />
    </>}
  </Screen>;
}
const styles = StyleSheet.create({ header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md }, title: { flex: 1 }, list: { paddingVertical: spacing.md, flexGrow: 1 }, separator: { height: spacing.sm } });
