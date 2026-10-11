import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { AppText, Screen } from '../../src/components/ui';
import { ActionButton } from '../../src/components/ui/ActionButton';
import { FormField } from '../../src/components/ui/FormField';
import { CountrySelector } from '../../src/components/ui/CountrySelector';
import { RegionSelector } from '../../src/components/ui/RegionSelector';
import { PackagingSelector } from '../../src/components/collection/PackagingSelector';
import { EditionImage } from '../../src/components/add/EditionImage';
import { EditionCoverPicker } from '../../src/components/covers/EditionCoverPicker';
import { EditionBackCoverField } from '../../src/components/covers/EditionBackCoverField';
import { EditionCoverPhotoButton } from '../../src/components/covers/EditionCoverPhotoButton';
import { useCollectionItem } from '../../src/hooks/useCollection';
import { useSession } from '../../src/contexts/SessionContext';
import { useSuccessFeedback } from '../../src/components/visual/SuccessFeedback';
import { queryKeys } from '../../src/lib/queryClient';
import { editCollectionEdition } from '../../src/services/collection/editing';
import { parseEditionForm } from '../../src/services/collection/editionEditing';
import { buildEditionCoverQuery } from '../../src/services/covers';
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
  const [values, setValues] = useState({ editionName: edition.edition_name ?? '', publisher: edition.publisher ?? '', country: edition.country ?? '', region: edition.region ?? '', videoStandard: edition.video_standard ?? null, discCount: edition.disc_count?.toString() ?? '', customCoverUrl: edition.custom_cover_url, backCoverUrl: edition.back_cover_url ?? null, packagingType: edition.packaging_type });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [backCoverBusy, setBackCoverBusy] = useState(false);
  const [frontCoverBusy, setFrontCoverBusy] = useState(false);
  const coverBusy = frontCoverBusy || backCoverBusy;
  const frontCover = values.customCoverUrl ?? edition.product_image_url ?? edition.movie.poster_url;
  const [error, setError] = useState('');
  const save = useMutation({
    mutationFn: (fields: ReturnType<typeof parseEditionForm>) => editCollectionEdition(item.id, edition.id, fields),
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: queryKeys.collection(session!.user.id) });
      showSuccess(); onBack();
    },
  });
  const field = (key: 'editionName' | 'publisher' | 'country' | 'region' | 'discCount') => (text: string) => setValues(previous => ({ ...previous, [key]: text }));
  const submit = () => {
    if (save.isPending || coverBusy) return;
    setError('');
    try { save.mutate(parseEditionForm(values)); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Confira os dados.'); }
  };
  return <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
      <AppText variant="heading">Editar edição</AppText>
      <AppText color="textMuted">{edition.movie.title}</AppText>
      <EditionImage key={frontCover} uri={frontCover} label="Capa da edição" />
      <View style={styles.form}>
        <ActionButton secondary label="Buscar nova capa" disabled={save.isPending || coverBusy} onPress={() => setPickerOpen(true)} />
        <EditionCoverPhotoButton side="front" value={values.customCoverUrl} label="Usar minha foto como capa" disabled={save.isPending || backCoverBusy} onBusyChange={setFrontCoverBusy} onSelect={url => setValues(previous => ({ ...previous, customCoverUrl: url }))} />
        {values.customCoverUrl && <ActionButton secondary label="Usar capa padrão" disabled={save.isPending || coverBusy} onPress={() => setValues(previous => ({ ...previous, customCoverUrl: null }))} />}
      </View>
      <EditionBackCoverField value={values.backCoverUrl} onChange={url => setValues(previous => ({ ...previous, backCoverUrl: url }))} onBusyChange={setBackCoverBusy} search={{ title: edition.movie.title, mediaFormat: edition.media_format, barcode: edition.barcode ?? undefined, editionName: values.editionName, publisher: values.publisher, country: values.country, region: values.region }} disabled={save.isPending || frontCoverBusy} />
      <FormField label="Nome da edição" value={values.editionName} onChangeText={field('editionName')} editable={!save.isPending} maxLength={200} />
      <CountrySelector value={values.country} onChange={field('country')} disabled={save.isPending} />
      <PackagingSelector value={values.packagingType} onChange={packagingType => setValues(previous => ({ ...previous, packagingType }))} disabled={save.isPending} />
      <FormField label="Distribuidora" value={values.publisher} onChangeText={field('publisher')} editable={!save.isPending} maxLength={200} />
      <FormField label="Quantidade de discos" value={values.discCount} onChangeText={field('discCount')} keyboardType="number-pad" editable={!save.isPending} />
      <RegionSelector value={values.region} videoStandard={values.videoStandard} mediaFormat={edition.media_format} onChange={selection => setValues(previous => ({ ...previous, ...selection }))} disabled={save.isPending} />
      {(error || save.isError) && <AppText accessibilityRole="alert" color="textMuted">{error || save.error?.message}</AppText>}
      <ActionButton label="Salvar edição" busy={save.isPending} disabled={coverBusy} onPress={submit} />
      <ActionButton secondary label="Cancelar" disabled={save.isPending || coverBusy} onPress={onBack} />
      {pickerOpen && <EditionCoverPicker title={edition.movie.title} initialQuery={buildEditionCoverQuery({ title: edition.movie.title, mediaFormat: edition.media_format, barcode: edition.barcode ?? undefined, editionName: values.editionName, publisher: values.publisher, country: values.country, region: values.region })} onClose={() => setPickerOpen(false)} onSelect={url => { setValues(previous => ({ ...previous, customCoverUrl: url })); setPickerOpen(false); }} />}
    </ScrollView>
  </KeyboardAvoidingView>;
}
const styles = StyleSheet.create({ flex: { flex: 1 }, form: { gap: spacing.md, paddingVertical: spacing.md, paddingBottom: spacing.lg } });
