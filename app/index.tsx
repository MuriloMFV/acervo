import { SuccessFeedbackHost } from '../src/components/visual/SuccessFeedback';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Keyboard, StyleSheet, View } from 'react-native';
import { CollectionSearchBar, MovieGrid, MovieList, type CollectionView } from '../src/components/movie';
import { CollectionBrandHeader, CollectionHeader } from '../src/components/collection/CollectionHeader';
import { CollectionToolbar } from '../src/components/collection/CollectionToolbar';
import { BottomNavigation } from '../src/components/collection/BottomNavigation';
import { AppText, Screen } from '../src/components/ui';
import { VisualFeedback } from '../src/components/visual/VisualFeedback';
import { ActionButton } from '../src/components/ui/ActionButton';
import { useCollection } from '../src/hooks/useCollection';
import { useCollectionBoxes } from '../src/hooks/useCollectionBoxes';
import { useProfile } from '../src/hooks/useProfile';
import { useProfilePhoto } from '../src/hooks/useProfilePhoto';
import { colors, radius, spacing } from '../src/theme';
import { useCollectionFilters } from '../src/contexts/CollectionFiltersContext';
import { CollectionFiltersPanel } from '../src/components/collection/CollectionFiltersPanel';
import { applyCollectionFilters, availableCollectionFilters } from '../src/utils/collectionFilters';
import { calculateCollectionStats } from '../src/utils/collectionStats';
import { mergeCollectionItems } from '../src/utils/collectionItems';

export default function CollectionScreen() {
  const router = useRouter();
  const collection = useCollection();
  const boxes = useCollectionBoxes();
  const profile = useProfile();
  const photo = useProfilePhoto(profile.data ?? null);
  const { added } = useLocalSearchParams<{ added?: string }>();
  const { filters, setFilters, search, setSearch, active, reset } = useCollectionFilters();
  const openItem = useCallback((id: string) => {
    if (id.startsWith('box:')) {
      router.push({ pathname: '/boxes/[id]', params: { id: id.slice(4) } });
      return;
    }
    router.push({ pathname: '/collection/[id]', params: { id } });
  }, [router]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [view, setView] = useState<CollectionView>('grid');
  const stats = useMemo(() => calculateCollectionStats(collection.data ?? []), [collection.data]);
  const physicalCount = stats.total + (boxes.data?.length ?? 0);
  const options = useMemo(() => availableCollectionFilters(collection.data ?? []), [collection.data]);
  const items = useMemo(() => mergeCollectionItems(
    applyCollectionFilters(collection.data ?? [], search, filters),
    (boxes.data ?? []).filter(item => item.box_set.name.toLocaleLowerCase('pt-BR').includes(search.trim().toLocaleLowerCase('pt-BR'))),
    filters.sort,
  ), [collection.data, boxes.data, search, filters]);
  const visibleCount = items.length;
  const CollectionItems = view === 'list' ? MovieList : MovieGrid;
  useEffect(() => {
    if (!added) return;
    reset(); setView('grid');
    router.setParams({ added: undefined });
  }, [added, router, reset]);

  return (
    <Screen edges={['top', 'left', 'right']} style={styles.screen}>
      <CollectionBrandHeader photoUrl={photo.url} photoLoading={photo.loading} />
      <View style={[styles.content, view === 'grid' && styles.gridContent]}>
        <CollectionItems
          items={items}
          sort={filters.sort}
          onItemPress={openItem}
          emptyState={collection.isPending ? <ActivityIndicator accessibilityLabel="Carregando coleção" color={colors.accent} /> : collection.isError ? (
            <View style={styles.header}>
              <AppText color="textMuted">Não foi possível carregar a coleção</AppText>
              <ActionButton label="Tentar novamente" onPress={() => { void collection.refetch(); }} />
            </View>
          ) : <VisualFeedback animation="film" loop={false} label={physicalCount ? 'Nenhum item encontrado' : 'Nenhum item no Acervo'} />}
          header={
            <View style={[styles.header, view === 'grid' && styles.gridHeader]}>
              <CollectionHeader count={physicalCount} />
              <CollectionSearchBar value={search} onChangeText={setSearch} />
              <CollectionToolbar sort={filters.sort} onSortChange={(sort) => setFilters((current) => ({ ...current, sort }))} view={view} onViewChange={setView} filtersActive={active} onFiltersPress={() => { Keyboard.dismiss(); setFiltersOpen(true); }} />
              {boxes.isPending && <ActivityIndicator accessibilityLabel="Carregando boxes" color={colors.accent} />}
              {boxes.isError && <View style={styles.header}><AppText variant="caption" color="textMuted">Não foi possível carregar os boxes</AppText><ActionButton secondary label="Tentar novamente" onPress={() => { void boxes.refetch(); }} /></View>}
            </View>
          }
          footer={visibleCount ? (
            <View style={styles.footer}>
              <View style={styles.handle} />
              <AppText variant="caption" color="textMuted">{visibleCount} {visibleCount === 1 ? 'item' : 'itens'} no seu acervo</AppText>
            </View>
          ) : undefined}
        />
      </View>
      <BottomNavigation count={physicalCount} onCollectionPress={() => { reset(); setView('grid'); }} onAddPress={() => router.navigate('/add')} onProfilePress={() => router.navigate('/profile')} />
      <SuccessFeedbackHost />
      {filtersOpen && <CollectionFiltersPanel filters={filters} options={options} onApply={(next) => { setFilters(next); setFiltersOpen(false); }} onClear={reset} onClose={() => setFiltersOpen(false)} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 0 },
  content: { flex: 1, paddingHorizontal: spacing.page },
  gridContent: { paddingHorizontal: spacing.sm },
  header: { gap: spacing.sm, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  gridHeader: { paddingHorizontal: spacing.page - spacing.sm, paddingBottom: spacing.md },
  empty: { textAlign: 'center', paddingVertical: spacing.xl },
  footer: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  handle: { width: spacing.xl, height: spacing.xs, borderRadius: radius.full, backgroundColor: colors.surfaceActive },
});
