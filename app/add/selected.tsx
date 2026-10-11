import { useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, Image, ScrollView, StyleSheet, View } from 'react-native';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import { AppText, Chip, IconButton, Screen } from '../../src/components/ui';
import { EditionCoverPicker } from '../../src/components/covers/EditionCoverPicker';
import { EditionBackCoverField } from '../../src/components/covers/EditionBackCoverField';
import { buildEditionCoverQuery } from '../../src/services/covers';
import { FormField } from '../../src/components/ui/FormField';
import { ActionButton } from '../../src/components/ui/ActionButton';
import { ConditionSelector } from '../../src/components/collection/ConditionSelector';
import { PackagingSelector } from '../../src/components/collection/PackagingSelector';
import { CountrySelector } from '../../src/components/ui/CountrySelector';
import { DistributorSelector } from '../../src/components/ui/DistributorSelector';
import { RegionSelector } from '../../src/components/ui/RegionSelector';
import { useSession } from '../../src/contexts/SessionContext';
import { queryKeys } from '../../src/lib/queryClient';
import { createCollectionItem } from '../../src/services/collection';
import { getMovieDetails } from '../../src/services/tmdb';
import type { MediaFormat, ItemCondition, PackagingType } from '../../src/services/supabase/types';
import type { VideoStandard } from '../../src/types/videoStandard';
import { MediaFormatIcon } from '../../src/components/visual/AssetIcon';
import { useSuccessFeedback } from '../../src/components/visual/SuccessFeedback';
import { mediaFormatLabels } from '../../src/components/movie/MediaFormatBadge';
import { colors, controls, radius, spacing } from '../../src/theme';
import { movieLayout } from '../../src/theme/media';

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
  const [condition, setCondition] = useState<ItemCondition>('GOOD');
  const [customCoverUrl, setCustomCoverUrl] = useState<string | null>(null);
  const [backCoverUrl, setBackCoverUrl] = useState<string | null>(null);
  const [backCoverBusy, setBackCoverBusy] = useState(false);
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editionName, setEditionName] = useState('');
  const [publisher, setPublisher] = useState('');
  const [region, setRegion] = useState('');
  const [videoStandard, setVideoStandard] = useState<VideoStandard | null>(null);
  const [country, setCountry] = useState('');
  const [packagingType, setPackagingType] = useState<PackagingType>('STANDARD');
  const saving = useRef(false);
  const save = useMutation({
    mutationFn: () => {
      if (!movie.data || !session) throw new Error('Filme ou sessão indisponível');
      return createCollectionItem(movie.data, format, condition, { customCoverUrl, backCoverUrl, editionName, publisher, region, videoStandard, country, packagingType });
    },
    onSuccess: async (item) => {
      await cache.invalidateQueries({ queryKey: queryKeys.collection(session!.user.id) });
      showSuccess();
      router.dismissTo({ pathname: '/', params: { added: item.id } });
    },
  });
  const submit = async () => {
    if (saving.current || backCoverBusy) return;
    saving.current = true;
    try { await save.mutateAsync(); } catch { /* The mutation error is shown below. */ }
    finally { saving.current = false; }
  };
  const goBack = () => router.canGoBack() ? router.back() : router.replace('/add/search');

  return (
    <Screen>
      <View style={styles.header}>
        <IconButton accessibilityLabel="Voltar à busca" onPress={goBack} disabled={save.isPending || backCoverBusy}><ArrowLeft size={controls.iconSize} color={colors.textSecondary} /></IconButton>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {validId && movie.isPending && <ActivityIndicator accessibilityLabel="Carregando filme" color={colors.accent} />}
        {validId && movie.isError && <>
          <AppText accessibilityRole="alert" color="textMuted">Não foi possível carregar agora</AppText>
          <ActionButton label="Tentar novamente" onPress={() => { void movie.refetch(); }} />
        </>}
        {!validId && <AppText color="textMuted">Filme não encontrado</AppText>}
        {movie.data && <>
          {(customCoverUrl || movie.data.posterUrl) && <Image accessibilityLabel={`Poster de ${movie.data.title}`} source={{ uri: customCoverUrl ?? movie.data.posterUrl! }} resizeMode="cover" resizeMethod="resize" style={styles.poster} />}
          <AppText variant="title">{movie.data.title}</AppText>
          <AppText color="textMuted">{movie.data.year ?? '—'}</AppText>
          <AppText variant="label">Formato</AppText>
          <View style={styles.formats}>
            {(Object.keys(mediaFormatLabels) as MediaFormat[]).map((value) => <Chip hideLabel icon={<MediaFormatIcon format={value} color={format === value ? colors.onPrimary : colors.textSecondary} />} key={value} label={mediaFormatLabels[value]} selected={format === value} onPress={() => setFormat(value)} disabled={save.isPending} />)}
          </View>
          <ActionButton secondary label={detailsOpen ? 'Menos detalhes' : 'Mais detalhes'} disabled={save.isPending} onPress={() => setDetailsOpen(value => !value)} />
          {detailsOpen && <>
            <FormField label="Nome da edição" value={editionName} onChangeText={setEditionName} editable={!save.isPending} />
            <DistributorSelector value={publisher} onChange={setPublisher} disabled={save.isPending} />
            <RegionSelector value={region} videoStandard={videoStandard} mediaFormat={format} onChange={selection => { setRegion(selection.region); setVideoStandard(selection.videoStandard); }} disabled={save.isPending} />
            <CountrySelector value={country} onChange={setCountry} disabled={save.isPending} />
            <PackagingSelector value={packagingType} onChange={setPackagingType} disabled={save.isPending} />
          </>}
          <ActionButton secondary label="Buscar capa" disabled={save.isPending} onPress={() => setCoverPickerOpen(true)} />
          {customCoverUrl && <ActionButton secondary label="Usar poster do TMDB" disabled={save.isPending} onPress={() => setCustomCoverUrl(null)} />}
          {coverPickerOpen && <EditionCoverPicker title={movie.data.title} initialQuery={buildEditionCoverQuery({ title: movie.data.title, mediaFormat: format, editionName, publisher, region, country })} onClose={() => setCoverPickerOpen(false)} onSelect={(url) => { setCustomCoverUrl(url); setCoverPickerOpen(false); }} />}
          <EditionBackCoverField value={backCoverUrl} onChange={setBackCoverUrl} onBusyChange={setBackCoverBusy} search={{ title: movie.data.title, mediaFormat: format, editionName, publisher, region, country }} disabled={save.isPending} />
          <ConditionSelector value={condition} onChange={setCondition} disabled={save.isPending} />
          {save.isError && <AppText accessibilityRole="alert" color="textMuted">Não foi possível adicionar ao Acervo. Tente novamente.</AppText>}
          <ActionButton label="Adicionar ao Acervo" busy={save.isPending} disabled={backCoverBusy} onPress={() => { void submit(); }} />
        </>}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingVertical: spacing.md, alignItems: 'flex-start' },
  content: { flexGrow: 1, gap: spacing.md, paddingVertical: spacing.lg },
  formats: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  poster: { width: spacing.xl * 4, aspectRatio: movieLayout.posterAspectRatio, borderRadius: radius.md, backgroundColor: colors.surface },
});
