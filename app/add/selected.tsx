import { useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import { AppText, Chip, IconButton, Screen } from '../../src/components/ui';
import { ActionButton } from '../../src/components/ui/ActionButton';
import { EditionMetadataFields, type EditionMetadataValues } from '../../src/components/collection/EditionMetadataFields';
import { EditionCoverFields } from '../../src/components/covers/EditionCoverFields';
import { CopyFields } from '../../src/components/collection/CopyFields';
import { useSession } from '../../src/contexts/SessionContext';
import { queryKeys } from '../../src/lib/queryClient';
import { createCollectionItem } from '../../src/services/collection';
import { getMovieDetails } from '../../src/services/tmdb';
import type { MediaFormat } from '../../src/services/supabase/types';
import type { CopyFormValues } from '../../src/services/collection/types';
import { MediaFormatIcon } from '../../src/components/visual/AssetIcon';
import { useSuccessFeedback } from '../../src/components/visual/SuccessFeedback';
import { mediaFormatLabels } from '../../src/components/movie/MediaFormatBadge';
import { colors, controls, spacing } from '../../src/theme';

export default function SelectedMovieScreen() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const router = useRouter();
  const showSuccess = useSuccessFeedback();
  const { session } = useSession();
  const cache = useQueryClient();
  const movieId = typeof id === 'string' ? id : '';
  const validId = /^[1-9]\d*$/.test(movieId) && Number.isSafeInteger(Number(movieId));
  const movie = useQuery({ queryKey: queryKeys.movie(movieId), queryFn: ({ signal }) => getMovieDetails(movieId, signal), enabled: validId, staleTime: 300_000 });
  const [format, setFormat] = useState<MediaFormat>('DVD');
  const [edition, setEdition] = useState<EditionMetadataValues>({ editionName: '', publisher: '', country: '', region: '', discCount: '', barcode: '', customCoverUrl: null, backCoverUrl: null, packagingType: 'STANDARD', videoStandard: null, isSpecialEdition: false, isLimitedEdition: false });
  const [copy, setCopy] = useState<CopyFormValues>({ condition: 'GOOD', price: '', date: '', place: '', notes: '', favorite: false });
  const [coverBusy, setCoverBusy] = useState(false);
  const saving = useRef(false);
  const save = useMutation({
    mutationFn: () => {
      if (!movie.data || !session) throw new Error('Filme ou sessão indisponível');
      return createCollectionItem(movie.data, format, copy.condition, edition, copy);
    },
    onSuccess: async (item) => {
      await cache.invalidateQueries({ queryKey: queryKeys.collection(session!.user.id) });
      await cache.invalidateQueries({ queryKey: queryKeys.barcodes(session!.user.id), refetchType: 'none' });
      showSuccess();
      router.dismissTo({ pathname: '/', params: { added: item.id } });
    },
  });
  const submit = async () => {
    if (saving.current || coverBusy) return;
    saving.current = true;
    try { await save.mutateAsync(); } catch { /* The mutation error is shown below. */ }
    finally { saving.current = false; }
  };
  const goBack = () => router.canGoBack() ? router.back() : router.replace('/add/search');
  const disabled = save.isPending || coverBusy;

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton accessibilityLabel="Voltar à busca" onPress={goBack} disabled={disabled}><ArrowLeft size={controls.iconSize} color={colors.textSecondary} /></IconButton>
      </View>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {validId && movie.isPending && <ActivityIndicator accessibilityLabel="Carregando filme" color={colors.accent} />}
          {validId && movie.isError && <>
            <AppText accessibilityRole="alert" color="textMuted">Não foi possível carregar agora</AppText>
            <ActionButton label="Tentar novamente" onPress={() => { void movie.refetch(); }} />
          </>}
          {!validId && <AppText color="textMuted">Filme não encontrado</AppText>}
          {movie.data && <>
            <AppText variant="title">{movie.data.title}</AppText>
            <AppText color="textMuted">{movie.data.year ?? '—'}</AppText>
            <AppText variant="heading">Minha edição</AppText>
            <AppText variant="label">Formato</AppText>
            <View style={styles.formats}>
              {(Object.keys(mediaFormatLabels) as MediaFormat[]).map(value => <Chip hideLabel icon={<MediaFormatIcon format={value} color={format === value ? colors.onPrimary : colors.textSecondary} />} key={value} label={mediaFormatLabels[value]} selected={format === value} onPress={() => setFormat(value)} disabled={disabled} />)}
            </View>
            <EditionMetadataFields values={edition} mediaFormat={format} onChange={changes => setEdition(previous => ({ ...previous, ...changes }))} disabled={disabled} />
            <EditionCoverFields customCoverUrl={edition.customCoverUrl} backCoverUrl={edition.backCoverUrl ?? null} fallbackCoverUrl={movie.data.posterUrl} search={{ title: movie.data.title, mediaFormat: format, barcode: edition.barcode || undefined, editionName: edition.editionName, publisher: edition.publisher, region: edition.region, country: edition.country }} onChange={changes => setEdition(previous => ({ ...previous, ...changes }))} onBusyChange={setCoverBusy} disabled={save.isPending} />
            <AppText variant="heading">Minha cópia</AppText>
            <CopyFields values={copy} onChange={changes => setCopy(previous => ({ ...previous, ...changes }))} disabled={disabled} />
            {save.isError && <AppText accessibilityRole="alert" color="textMuted">{save.error instanceof Error ? save.error.message : 'Não foi possível adicionar ao Acervo. Tente novamente.'}</AppText>}
            <ActionButton label="Adicionar ao Acervo" busy={save.isPending} disabled={coverBusy} onPress={() => { void submit(); }} />
          </>}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingVertical: spacing.md, alignItems: 'flex-start' },
  content: { flexGrow: 1, gap: spacing.md, paddingVertical: spacing.lg },
  formats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
