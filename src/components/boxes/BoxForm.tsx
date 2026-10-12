import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import X from 'lucide-react-native/icons/x';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import { AppText, Chip, IconButton } from '../ui';
import { FormField } from '../ui/FormField';
import { ActionButton } from '../ui/ActionButton';
import { EditionMetadataFields } from '../collection/EditionMetadataFields';
import { CopyFields } from '../collection/CopyFields';
import { EditionCoverFields } from '../covers/EditionCoverFields';
import { BoxMoviePicker } from './BoxMoviePicker';
import { MediaFormatIcon } from '../visual/AssetIcon';
import { useSuccessFeedback } from '../visual/SuccessFeedback';
import { useSession } from '../../contexts/SessionContext';
import { mediaFormatLabels } from '../movie/MediaFormatBadge';
import { colors, controls, radius, spacing } from '../../theme';
import { getMovieDetails } from '../../services/tmdb';
import { createCollectionBox, editCollectionBox } from '../../services/boxes';
import { parseBoxForm } from '../../services/boxes/mappers';
import { BoxChangedError, boxFormValues, boxMovieSelection, validateBoxSelection } from '../../services/boxes/editing';
import type { BoxMovieSelection, CollectionBoxRecord } from '../../services/boxes/types';
import type { MediaFormat } from '../../services/supabase/types';
import { queryKeys } from '../../lib/queryClient';
import { boxQueryKeys } from '../../hooks/useCollectionBoxes';

export function BoxForm({ item, onSaved, onBack }: {
  item?: CollectionBoxRecord; onSaved: (id: string) => void; onBack: () => void;
}) {
  // Keep the version the user opened; refetches cannot bypass conflict checks.
  const original = useRef(item).current;
  const cache = useQueryClient();
  const { session } = useSession();
  const showSuccess = useSuccessFeedback();
  const [form, setForm] = useState(() => boxFormValues(original));
  const [selected, setSelected] = useState<BoxMovieSelection[]>(() => original ? boxMovieSelection(original) : []);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  const [error, setError] = useState('');
  const saving = useRef(false);
  const change = (changes: Partial<typeof form>) => { setForm(current => ({ ...current, ...changes })); setError(''); };
  const toggle = (movie: BoxMovieSelection) => {
    setError('');
    setSelected(current => current.some(value => value.id === movie.id)
      ? current.filter(value => value.id !== movie.id)
      : current.length < 100 ? [...current, movie] : current);
  };
  const save = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error('Sessão indisponível.');
      const loadMovie = (id: string) => cache.fetchQuery({ queryKey: queryKeys.movie(id), queryFn: ({ signal }) => getMovieDetails(id, signal), staleTime: 300_000 });
      const id = original ? await editCollectionBox(original, form, selected, session.user.id, loadMovie)
        : await createCollectionBox(form, selected, session.user.id, loadMovie);
      return { id, userId: session.user.id };
    },
    onSuccess: async ({ id, userId }) => {
      await cache.invalidateQueries({ queryKey: boxQueryKeys.collection(userId) });
      showSuccess(); onSaved(id);
    },
    onError: async cause => {
      if (cause instanceof BoxChangedError && original) await cache.invalidateQueries({ queryKey: boxQueryKeys.collection(original.user_id) });
    },
  });
  const disabled = save.isPending || coverBusy;
  const submit = async () => {
    if (saving.current || disabled) return;
    setError('');
    try { parseBoxForm(form); validateBoxSelection(selected); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Confira os campos.'); return; }
    saving.current = true;
    try { await save.mutateAsync(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível salvar o box.'); }
    finally { saving.current = false; }
  };

  return <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      <View style={styles.header}><IconButton accessibilityLabel="Voltar" disabled={disabled} onPress={onBack}><ArrowLeft size={controls.iconSize} color={colors.textSecondary} /></IconButton>
        <AppText variant="heading">{original ? 'Editar box' : 'Adicionar box'}</AppText></View>
      <FormField label="Nome do box" value={form.name} maxLength={200} editable={!disabled} onChangeText={name => change({ name })} />
      <AppText variant="label">Formato</AppText>
      <View style={styles.wrap}>{(Object.keys(mediaFormatLabels) as MediaFormat[]).map(format => <Chip key={format}
        label={mediaFormatLabels[format]} hideLabel icon={<MediaFormatIcon format={format} color={form.mediaFormat === format ? colors.onPrimary : colors.textSecondary} />}
        selected={form.mediaFormat === format} disabled={disabled} onPress={() => change({ mediaFormat: format })} />)}</View>
      <EditionMetadataFields showPackaging={false} mediaFormat={form.mediaFormat} disabled={disabled}
        values={{ ...form, customCoverUrl: form.coverUrl || null, isSpecialEdition: form.special, isLimitedEdition: form.limited }}
        onChange={({ isSpecialEdition, isLimitedEdition, ...fields }) => change({ ...fields,
          ...(isSpecialEdition === undefined ? {} : { special: isSpecialEdition }),
          ...(isLimitedEdition === undefined ? {} : { limited: isLimitedEdition }),
        })} />
      <AppText variant="heading">Filmes incluídos</AppText>
      <AppText variant="caption" color="textSecondary">{selected.length} filmes selecionados</AppText>
      {selected.map(movie => <View key={movie.id} style={styles.selected}>
        <View style={styles.flex}><AppText variant="label">{movie.title}</AppText><AppText variant="caption" color="textMuted">{movie.year ?? '—'}</AppText></View>
        <IconButton accessibilityLabel={`Remover ${movie.title} da seleção`} disabled={disabled} onPress={() => toggle(movie)}><X size={controls.iconSize} color={colors.textSecondary} /></IconButton>
      </View>)}
      <ActionButton secondary label="Selecionar filmes" disabled={disabled} onPress={() => setPickerOpen(true)} />
      <AppText variant="heading">Capa do box</AppText>
      <EditionCoverFields customCoverUrl={form.coverUrl.trim() || null} backCoverUrl={form.backCoverUrl ?? null} imageLabel="Capa do box"
        fallbackCoverUrl={selected[0]?.posterUrl ?? null} search={{ title: form.name, mediaFormat: form.mediaFormat, barcode: form.barcode,
          editionName: form.editionName, publisher: form.publisher, country: form.country, region: form.region }}
        disabled={save.isPending} onBusyChange={setCoverBusy} onChange={({ customCoverUrl, backCoverUrl }) => change({
          ...(customCoverUrl === undefined ? {} : { coverUrl: customCoverUrl ?? '' }),
          ...(backCoverUrl === undefined ? {} : { backCoverUrl }),
        })} />
      <AppText variant="heading">Minha cópia</AppText>
      <CopyFields values={form} onChange={change} disabled={disabled} />
      {!!error && <AppText accessibilityRole="alert" color="danger">{error}</AppText>}
      <ActionButton label={original ? 'Salvar box' : 'Adicionar box ao Acervo'} busy={save.isPending} disabled={coverBusy} onPress={() => { void submit(); }} />
      <ActionButton secondary label="Cancelar" disabled={disabled} onPress={onBack} />
    </ScrollView>
    {pickerOpen && <BoxMoviePicker selected={selected} onToggle={toggle} onClose={() => setPickerOpen(false)} />}
  </KeyboardAvoidingView>;
}
const styles = StyleSheet.create({
  flex: { flex: 1 }, content: { gap: spacing.md, paddingVertical: spacing.md, paddingBottom: spacing.xl },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  selected: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.md },
});
