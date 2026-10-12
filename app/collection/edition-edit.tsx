import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { AppText, Screen } from '../../src/components/ui';
import { ActionButton } from '../../src/components/ui/ActionButton';
import { useCollectionItem } from '../../src/hooks/useCollection';
import { useSession } from '../../src/contexts/SessionContext';
import { useSuccessFeedback } from '../../src/components/visual/SuccessFeedback';
import { queryKeys } from '../../src/lib/queryClient';
import { editCollectionEdition } from '../../src/services/collection/editing';
import { EditionChangedError, parseEditionForm } from '../../src/services/collection/editionEditing';
import { EditionMetadataFields } from '../../src/components/collection/EditionMetadataFields';
import { EditionCoverFields } from '../../src/components/covers/EditionCoverFields';
import type { CollectionRecord } from '../../src/services/collection/types';
import { colors, spacing } from '../../src/theme';

export default function EditEditionScreen() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const itemId = typeof id === 'string' ? id : '';
  const router = useRouter();
  const query = useCollectionItem(itemId);
  const back = () => router.canGoBack() ? router.back() : router.replace({ pathname: '/collection/[id]', params: { id: itemId } });
  return <Screen>
    {query.isPending && itemId ? <ActivityIndicator color={colors.accent} /> : query.data ? <EditionForm key={query.data.id} item={query.data} onBack={back} /> : <><AppText color="textMuted">{query.isError ? 'Não foi possível carregar a edição' : 'Item não encontrado'}</AppText>{query.isError && <ActionButton secondary label="Tentar novamente" onPress={() => { void query.refetch(); }} />}<ActionButton secondary label="Voltar" onPress={back} /></>}
  </Screen>;
}
function EditionForm({ item, onBack }: { item: CollectionRecord; onBack: () => void }) {
  const { edition } = item;
  const { session } = useSession();
  const cache = useQueryClient();
  const showSuccess = useSuccessFeedback();
  const [values, setValues] = useState({ editionName: edition.edition_name ?? '', publisher: edition.publisher ?? '', country: edition.country ?? '', region: edition.region ?? '', videoStandard: edition.video_standard ?? null, discCount: edition.disc_count?.toString() ?? '', customCoverUrl: edition.custom_cover_url, backCoverUrl: edition.back_cover_url ?? null, packagingType: edition.packaging_type, barcode: edition.barcode ?? '', expectedUpdatedAt: edition.updated_at });
  const [coverBusy, setCoverBusy] = useState(false);
  const [error, setError] = useState('');
  const save = useMutation({
    mutationFn: (fields: ReturnType<typeof parseEditionForm>) => editCollectionEdition(item.id, edition.id, fields),
    onError: async cause => {
      if (cause instanceof EditionChangedError && session) await cache.invalidateQueries({ queryKey: queryKeys.collection(session.user.id) });
    },
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: queryKeys.collection(session!.user.id) });
      await cache.invalidateQueries({ queryKey: queryKeys.barcodes(session!.user.id), refetchType: 'none' });
      showSuccess(); onBack();
    },
  });
  const submit = () => {
    if (save.isPending || coverBusy) return;
    setError('');
    try { save.mutate(parseEditionForm(values)); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Confira os dados.'); }
  };
  return <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
      <AppText variant="heading">Editar edição</AppText>
      <AppText color="textMuted">{edition.movie.title}</AppText>
      <EditionCoverFields customCoverUrl={values.customCoverUrl} backCoverUrl={values.backCoverUrl} fallbackCoverUrl={edition.product_image_url ?? edition.movie.poster_url} search={{ title: edition.movie.title, mediaFormat: edition.media_format, barcode: values.barcode || undefined, editionName: values.editionName, publisher: values.publisher, country: values.country, region: values.region }} onChange={changes => setValues(previous => ({ ...previous, ...changes }))} onBusyChange={setCoverBusy} disabled={save.isPending} />
      <EditionMetadataFields values={values} mediaFormat={edition.media_format} onChange={changes => { setValues(previous => ({ ...previous, ...changes })); setError(''); }} disabled={save.isPending || coverBusy} />
      {(error || save.isError) && <AppText accessibilityRole="alert" color="textMuted">{error || save.error?.message}</AppText>}
      <ActionButton label="Salvar edição" busy={save.isPending} disabled={coverBusy} onPress={submit} />
      <ActionButton secondary label="Cancelar" disabled={save.isPending || coverBusy} onPress={onBack} />
    </ScrollView>
  </KeyboardAvoidingView>;
}
const styles = StyleSheet.create({ flex: { flex: 1 }, form: { gap: spacing.md, paddingVertical: spacing.md, paddingBottom: spacing.lg } });
