import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AppText, Chip } from '../ui';
import { FormField } from '../ui/FormField';
import { ActionButton } from '../ui/ActionButton';
import { ConditionSelector } from '../collection/ConditionSelector';
import { mediaFormatLabels } from '../movie/MediaFormatBadge';
import { EditionImage } from './EditionImage';
import { useSession } from '../../contexts/SessionContext';
import { queryKeys } from '../../lib/queryClient';
import { addKnownBarcodeEdition, addNewBarcodeEdition } from '../../services/barcode/save';
import { EditionConflictError } from '../../services/barcode/mappers';
import { editionCover } from '../../services/collection/mappers';
import { inferMediaFormat } from '../../utils/barcode';
import { packagingLabels } from '../../utils/collectionDetails';
import type { EditionCandidate, KnownEdition } from '../../types/barcode';
import type { MovieDetails } from '../../types/movieSearch';
import type { ItemCondition, MediaFormat, PackagingType } from '../../services/supabase/types';
import { buildEditionCoverQuery } from '../../services/covers';
import { EditionCoverPicker } from '../covers/EditionCoverPicker';
import { spacing } from '../../theme';

type Props = { barcode: string; onBusyChange?: (busy: boolean) => void } & (
  | { knownEdition: KnownEdition; movie?: never; candidate?: never }
  | { knownEdition?: never; movie: MovieDetails; candidate: EditionCandidate | null }
);
export function BarcodeConfirmation({ barcode, knownEdition, movie, candidate, onBusyChange }: Props) {
  const router = useRouter();
  const cache = useQueryClient();
  const { session } = useSession();
  const suggested = inferMediaFormat(candidate?.rawProductName ?? null);
  const [format, setFormat] = useState<MediaFormat | null>(knownEdition?.media_format ?? suggested);
  const [condition, setCondition] = useState<ItemCondition | null>(null);
  const [coverRejected, setCoverRejected] = useState(false);
  const [customCoverUrl, setCustomCoverUrl] = useState<string | null>(null);
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [publisher, setPublisher] = useState('');
  const [region, setRegion] = useState('');
  const [country, setCountry] = useState('');
  const [editionName, setEditionName] = useState(candidate?.rawProductName ?? '');
  const [packaging, setPackaging] = useState<PackagingType>('STANDARD');
  const [special, setSpecial] = useState(false);
  const [limited, setLimited] = useState(false);
  const saving = useRef(false);
  const title = knownEdition?.movie.title ?? movie!.title;
  const originalTitle = knownEdition?.movie.original_title ?? movie?.originalTitle;
  const year = knownEdition ? knownEdition.movie.release_year : movie!.year;
  const image = customCoverUrl ?? (knownEdition ? editionCover(knownEdition) : coverRejected ? movie!.posterUrl : candidate?.primaryImageUrl ?? movie!.posterUrl);
  const save = useMutation({
    mutationFn: async () => {
      if (!condition || !format || !session) throw new Error('Confirme formato e condição.');
      if (knownEdition) return addKnownBarcodeEdition(knownEdition.id, condition, coverRejected);
      return addNewBarcodeEdition(barcode, movie!, { mediaFormat: format, packagingType: packaging, publisher, region, country, editionName, customCoverUrl, productImageUrl: coverRejected ? null : candidate?.primaryImageUrl ?? null, isSpecialEdition: special, isLimitedEdition: limited }, condition, coverRejected);
    },
    onSuccess: async (item) => {
      await cache.invalidateQueries({ queryKey: queryKeys.barcodes(session!.user.id), refetchType: 'none' });
      await cache.invalidateQueries({ queryKey: queryKeys.collection(session!.user.id) });
      router.dismissTo({ pathname: '/', params: { added: item.id } });
    },
  });
  useEffect(() => {
    onBusyChange?.(save.isPending);
    return () => onBusyChange?.(false);
  }, [save.isPending, onBusyChange]);
  const submit = async () => {
    if (saving.current) return;
    saving.current = true;
    try { await save.mutateAsync(); } catch { /* Mutation error is rendered below. */ }
    finally { saving.current = false; }
  };
  const productImage = knownEdition ? knownEdition.custom_cover_url || knownEdition.product_image_url : candidate?.primaryImageUrl;
  return <View style={styles.content}>
    <EditionImage key={image} uri={image} fallback={knownEdition?.movie.poster_url ?? movie?.posterUrl} label={`Capa de ${title}`} />
    {!knownEdition && productImage && !coverRejected && !customCoverUrl && <AppText variant="caption" color="textMuted">Capa sugerida</AppText>}
    {productImage && !customCoverUrl && <ActionButton secondary disabled={save.isPending} label={coverRejected ? 'Restaurar capa' : 'Capa incorreta'} onPress={() => setCoverRejected((value) => !value)} />}
    {knownEdition && coverRejected && <AppText variant="caption" color="textMuted">Capa marcada para correção</AppText>}
    {!knownEdition && <>
      <ActionButton secondary label="Buscar capa" disabled={!format || save.isPending} onPress={() => setCoverPickerOpen(true)} />
      <ActionButton secondary label="Usar poster do TMDB" disabled={save.isPending} onPress={() => { setCustomCoverUrl(null); setCoverRejected(true); }} />
    </>}
    {coverPickerOpen && format && !knownEdition && <EditionCoverPicker title={title} initialQuery={buildEditionCoverQuery({ title, mediaFormat: format, barcode, editionName, publisher, region, country })} onClose={() => setCoverPickerOpen(false)} onSelect={(url) => { setCustomCoverUrl(url); setCoverRejected(false); setCoverPickerOpen(false); }} />}
    <AppText variant="title">{title}</AppText>
    {originalTitle && originalTitle !== title && <AppText variant="originalTitle" color="textSecondary">{originalTitle}</AppText>}
    <AppText color="textMuted">{year ?? '—'}</AppText>
    {!knownEdition && candidate?.title && <AppText variant="caption" color="textMuted">Produto: {candidate.title}</AppText>}
    <AppText variant="caption" color="textMuted">{barcode}</AppText>
    {knownEdition ? <View style={styles.content}>
      <AppText variant="heading">Minha edição</AppText><AppText>{mediaFormatLabels[knownEdition.media_format]}</AppText>
      {knownEdition.edition_name && <AppText color="textSecondary">{knownEdition.edition_name}</AppText>}
      {knownEdition.region && <AppText color="textSecondary">Região: {knownEdition.region}</AppText>}
      {knownEdition.publisher && <AppText color="textSecondary">Distribuidora: {knownEdition.publisher}</AppText>}
      {knownEdition.country && <AppText color="textSecondary">País: {knownEdition.country}</AppText>}
      {knownEdition.packaging_type !== 'STANDARD' && <AppText color="textSecondary">{packagingLabels[knownEdition.packaging_type]}</AppText>}
      {knownEdition.is_special_edition && <AppText variant="caption">Edição especial</AppText>}
      {knownEdition.is_limited_edition && <AppText variant="caption">Edição limitada</AppText>}
    </View> : <>
      <AppText variant="label">{suggested ? 'Formato sugerido' : 'Formato'}</AppText>
      <View style={styles.choices}>{(Object.keys(mediaFormatLabels) as MediaFormat[]).map((value) => <Chip key={value} label={mediaFormatLabels[value]} selected={format === value} disabled={save.isPending} onPress={() => setFormat(value)} />)}</View>
      <ActionButton secondary label={detailsOpen ? 'Menos detalhes' : 'Mais detalhes'} disabled={save.isPending} onPress={() => setDetailsOpen((value) => !value)} />
      {detailsOpen && <View style={styles.content}>
        <FormField label="Nome da edição" value={editionName} onChangeText={setEditionName} editable={!save.isPending} />
        <FormField label="Distribuidora" value={publisher} onChangeText={setPublisher} editable={!save.isPending} />
        <FormField label="Região / codificação" value={region} onChangeText={setRegion} editable={!save.isPending} />
        <FormField label="País" value={country} onChangeText={setCountry} editable={!save.isPending} />
        <AppText variant="label">Embalagem</AppText><View style={styles.choices}>{(Object.keys(packagingLabels) as PackagingType[]).map((value) => <Chip key={value} label={packagingLabels[value]} selected={packaging === value} disabled={save.isPending} onPress={() => setPackaging(value)} />)}</View>
        <View style={styles.choices}><Chip label="Edição especial" selected={special} disabled={save.isPending} onPress={() => setSpecial((value) => !value)} /><Chip label="Edição limitada" selected={limited} disabled={save.isPending} onPress={() => setLimited((value) => !value)} /></View>
      </View>}
    </>}
    <ConditionSelector value={condition} onChange={setCondition} disabled={save.isPending} />
    {save.isError && <AppText accessibilityRole="alert" color="textMuted">{save.error instanceof EditionConflictError ? save.error.message : 'Não foi possível adicionar ao Acervo. Tente novamente.'}</AppText>}
    {save.error instanceof EditionConflictError && <ActionButton secondary label="Consultar edição" onPress={() => { void cache.invalidateQueries({ queryKey: queryKeys.barcode(session!.user.id, barcode) }).then(() => router.dismissTo('/add/barcode')); }} />}
    <ActionButton label="Adicionar ao Acervo" disabled={!condition || !format} busy={save.isPending} onPress={() => { void submit(); }} />
  </View>;
}
const styles = StyleSheet.create({ content: { gap: spacing.md }, choices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm } });
