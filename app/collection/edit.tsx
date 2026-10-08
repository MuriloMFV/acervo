import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { AppText, Screen } from '../../src/components/ui';
import { ActionButton } from '../../src/components/ui/ActionButton';
import { FormField } from '../../src/components/ui/FormField';
import { ConditionSelector } from '../../src/components/collection/ConditionSelector';
import { useCollectionItem } from '../../src/hooks/useCollection';
import { useSession } from '../../src/contexts/SessionContext';
import { queryKeys } from '../../src/lib/queryClient';
import { updateCollectionItem } from '../../src/services/collection';
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
  const { session } = useSession();
  const cache = useQueryClient();
  const [values, setValues] = useState<CopyFormValues>({ condition: item.condition, price: item.purchase_price?.toString() ?? '', date: item.purchase_date ?? '', place: item.purchase_place ?? '', notes: item.notes ?? '' });
  const [error, setError] = useState('');
  const save = useMutation({
    mutationFn: (data: ReturnType<typeof parseCopyForm>) => updateCollectionItem(item.id, data),
    onSuccess: async () => { await cache.invalidateQueries({ queryKey: queryKeys.collection(session!.user.id) }); onBack(); },
  });
  const field = (key: 'price' | 'date' | 'place' | 'notes') => (text: string) => setValues((previous) => ({ ...previous, [key]: text }));
  const submit = () => {
    if (save.isPending) return;
    setError('');
    try { save.mutate(parseCopyForm(values)); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Confira os dados'); }
  };
  return <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
      <AppText variant="heading">Editar minha cópia</AppText>
      <AppText color="textMuted">{item.edition.movie.title}</AppText>
      <ConditionSelector value={values.condition} onChange={(condition) => setValues((previous) => ({ ...previous, condition }))} disabled={save.isPending} />
      <FormField label="Preço pago" value={values.price} onChangeText={field('price')} keyboardType="decimal-pad" editable={!save.isPending} />
      <FormField label="Data de aquisição" placeholder="AAAA-MM-DD" value={values.date} onChangeText={field('date')} keyboardType="numbers-and-punctuation" editable={!save.isPending} />
      <FormField label="Local de compra" value={values.place} onChangeText={field('place')} editable={!save.isPending} />
      <FormField label="Observações" value={values.notes} onChangeText={field('notes')} multiline editable={!save.isPending} />
      {(error || save.isError) && <AppText accessibilityRole="alert" color="textMuted">{error || 'Não foi possível salvar. Tente novamente.'}</AppText>}
      <ActionButton label="Salvar" busy={save.isPending} onPress={submit} />
      <ActionButton label="Cancelar" secondary disabled={save.isPending} onPress={onBack} />
    </ScrollView>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({ flex: { flex: 1 }, form: { gap: spacing.md, paddingVertical: spacing.lg, paddingBottom: spacing.xl } });
