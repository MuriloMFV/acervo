import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { AppText, Screen } from '../../src/components/ui';
import { useSuccessFeedback } from '../../src/components/visual/SuccessFeedback';
import { ActionButton } from '../../src/components/ui/ActionButton';
import { useCollectionItem } from '../../src/hooks/useCollection';
import { useSession } from '../../src/contexts/SessionContext';
import { queryKeys } from '../../src/lib/queryClient';
import { saveCopyChanges } from '../../src/services/collection/editing';
import { CopyFields } from '../../src/components/collection/CopyFields';
import { CopyPhoto } from '../../src/components/collection/CopyPhoto';
import type { PhotoDraft } from '../../src/services/photos/validation';
import { parseCopyForm } from '../../src/services/collection/mappers';
import type { CollectionRecord, CopyFormValues } from '../../src/services/collection/types';
import { colors, spacing } from '../../src/theme';

export default function EditCollectionItem() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const itemId = typeof id === 'string' ? id : '';
  const router = useRouter();
  const query = useCollectionItem(itemId);
  const goBack = () => router.canGoBack() ? router.back() : router.replace('/');
  return <Screen>
    {query.isPending && itemId ? <ActivityIndicator color={colors.accent} /> : query.data ? <CopyForm key={query.data.id} item={query.data} onBack={goBack} /> : <>
      <AppText>{query.isError ? 'Não foi possível carregar o item' : 'Item não encontrado'}</AppText>
      {query.isError && <ActionButton label="Tentar novamente" onPress={() => { void query.refetch(); }} />}
      <ActionButton label="Voltar" secondary onPress={goBack} />
    </>}
  </Screen>;
}

function CopyForm({ item, onBack }: { item: CollectionRecord; onBack: () => void }) {
  const showSuccess = useSuccessFeedback();
  const { session } = useSession();
  const cache = useQueryClient();
  const [values, setValues] = useState<CopyFormValues>({ condition: item.condition, price: item.purchase_price?.toString() ?? '', date: item.purchase_date ?? '', place: item.purchase_place ?? '', notes: item.notes ?? '', favorite: item.is_favorite, usePhotoAsCover: item.use_photo_as_cover ?? false });
  const [error, setError] = useState('');
  const [pickingPhoto, setPickingPhoto] = useState(false);
  const [photo, setPhoto] = useState<PhotoDraft>({ action: 'keep' });
  const save = useMutation({
    mutationFn: (data: ReturnType<typeof parseCopyForm>) => saveCopyChanges(item.id, data, item.photo_url ?? null, photo),
    onSuccess: async (result) => {
      if (result.cleanupPending) console.warn('Foto anterior desvinculada; limpeza do Storage pendente.'); await cache.invalidateQueries({ queryKey: queryKeys.collection(session!.user.id) }); showSuccess(); onBack(); },
  });
  const hasPhoto = photo.action === 'replace' || photo.action === 'keep' && !!item.photo_url;
  const submit = () => {
    if (save.isPending || pickingPhoto) return;
    setError('');
    try { save.mutate(parseCopyForm({ ...values, usePhotoAsCover: hasPhoto && !!values.usePhotoAsCover })); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Confira os dados'); }
  };
  return <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      <AppText variant="heading">Editar minha cópia</AppText>
      <AppText color="textMuted">{item.edition.movie.title}</AppText>
      <CopyFields values={values} onChange={changes => setValues(previous => ({ ...previous, ...changes }))} disabled={save.isPending} />
      <CopyPhoto itemId={item.id} path={item.photo_url ?? null} draft={photo} onChange={setPhoto} onBusyChange={setPickingPhoto} disabled={save.isPending} />
      {hasPhoto && <View style={styles.favorite}>
        <AppText variant="label" style={styles.toggleLabel}>Usar minha foto como capa</AppText>
        <Switch accessibilityLabel="Usar minha foto como capa" value={!!values.usePhotoAsCover} disabled={save.isPending || pickingPhoto} onValueChange={usePhotoAsCover => setValues(previous => ({ ...previous, usePhotoAsCover }))} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.text} />
      </View>}
      {(error || save.isError) && <AppText accessibilityRole="alert" color="textMuted">{error || 'Não foi possível salvar. Tente novamente.'}</AppText>}
      <ActionButton label="Salvar" disabled={pickingPhoto} busy={save.isPending} onPress={submit} />
      <ActionButton label="Cancelar" secondary disabled={save.isPending || pickingPhoto} onPress={onBack} />
    </ScrollView>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({ flex: { flex: 1 }, toggleLabel: { flex: 1 }, favorite: { gap: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, form: { gap: spacing.md, paddingVertical: spacing.lg, paddingBottom: spacing.xl } });
