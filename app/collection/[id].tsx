import { CopyPhoto } from '../../src/components/collection/CopyPhoto';
import { SuccessFeedbackHost } from '../../src/components/visual/SuccessFeedback';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import { AppText, IconButton, Screen } from '../../src/components/ui';
import { ActionButton } from '../../src/components/ui/ActionButton';
import { MovieHero } from '../../src/components/collection/MovieHero';
import { DetailActionBar } from '../../src/components/collection/DetailActionBar';
import { EditionDetails } from '../../src/components/collection/EditionDetails';
import { useCollectionItem } from '../../src/hooks/useCollection';
import { useSession } from '../../src/contexts/SessionContext';
import { queryKeys } from '../../src/lib/queryClient';
import { deleteCollectionItem, updateFavorite } from '../../src/services/collection';
import { mapCollectionDetails } from '../../src/services/collection/mappers';
import { colors, controls, spacing } from '../../src/theme';

export default function CollectionItemRoute() {
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  const itemId = typeof id === 'string' ? id : '';
  const router = useRouter();
  const { session } = useSession();
  const cache = useQueryClient();
  const query = useCollectionItem(itemId);
  const refresh = () => cache.invalidateQueries({ queryKey: queryKeys.collection(session!.user.id) });
  const favorite = useMutation({ mutationFn: (value: boolean) => updateFavorite(itemId, value), onSuccess: refresh });
  const remove = useMutation({
    mutationFn: () => deleteCollectionItem(itemId),
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: queryKeys.collection(session!.user.id), exact: true });
      router.dismissTo('/');
      cache.removeQueries({ queryKey: queryKeys.item(session!.user.id, itemId), exact: true });
    },
  });
  const item = query.data ? mapCollectionDetails(query.data) : null;
  const busy = favorite.isPending || remove.isPending;
  const goBack = () => router.canGoBack() ? router.back() : router.replace('/');
  const confirmRemoval = () => Alert.alert('Remover item?', item?.movie.title, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Remover', style: 'destructive', onPress: () => remove.mutate() },
  ]);
  return (
    <Screen style={styles.screen}>
      <View style={styles.header}>
        <IconButton accessibilityLabel="Voltar à coleção" onPress={goBack} disabled={busy}><ArrowLeft size={controls.iconSize} color={colors.text} /></IconButton>
        <AppText variant="heading" style={styles.headerTitle}>Detalhes do filme</AppText>
      </View>
      {query.isPending && itemId ? <ActivityIndicator accessibilityLabel="Carregando item" color={colors.accent} /> : query.isError ? (
        <View style={styles.notFound}>
          <AppText color="textMuted">Não foi possível carregar o item</AppText>
          <ActionButton label="Tentar novamente" onPress={() => { void query.refetch(); }} />
        </View>
      ) : !item ? <View style={styles.notFound}><AppText>Item não encontrado</AppText></View> : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <MovieHero movie={item.movie} backCover={item.edition.backCover} />
          <View style={styles.content}>
            <DetailActionBar favorite={item.copy.favorite} disabled={busy} onToggleFavorite={() => favorite.mutate(!item.copy.favorite)} onEdit={() => router.navigate({ pathname: '/collection/edit', params: { id: itemId } })} onRemove={confirmRemoval} />
            {busy && <ActivityIndicator accessibilityLabel="Salvando alteração" color={colors.accent} />}
            {(favorite.isError || remove.isError) && <AppText accessibilityRole="alert" color="textMuted">Não foi possível salvar a alteração. Tente novamente.</AppText>}
            {!!item.movie.overview && <View style={styles.synopsis}><AppText variant="caption" color="textMuted">SINOPSE</AppText><AppText color="textSecondary">{item.movie.overview}</AppText></View>}
            <EditionDetails item={item} special={query.data?.edition.is_special_edition} limited={query.data?.edition.is_limited_edition} onEdit={() => router.navigate({ pathname: '/collection/edition-edit', params: { id: itemId } })} />
            <CopyPhoto itemId={itemId} path={query.data?.photo_url ?? null} onEdit={() => router.navigate({ pathname: '/collection/edit', params: { id: itemId } })} />
          </View>
        </ScrollView>
      )}
      <SuccessFeedbackHost />
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 0 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.page, paddingVertical: spacing.sm },
  headerTitle: { flex: 1 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.page, gap: spacing.md },
  scroll: { paddingBottom: spacing.xl },
  content: { padding: spacing.page, gap: spacing.lg },
  synopsis: { gap: spacing.sm },
});
