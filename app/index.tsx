import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Keyboard, StyleSheet, View } from 'react-native';
import { CollectionSearchBar, MovieGrid, type CollectionView } from '../src/components/movie';
import { CollectionBrandHeader, CollectionHeader } from '../src/components/collection/CollectionHeader';
import { CollectionToolbar } from '../src/components/collection/CollectionToolbar';
import { FormatFilterBar } from '../src/components/collection/FormatFilterBar';
import { BottomNavigation } from '../src/components/collection/BottomNavigation';
import { AppText, Screen } from '../src/components/ui';
import { ActionButton } from '../src/components/ui/ActionButton';
import { useCollection } from '../src/hooks/useCollection';
import { mapCollectionCard } from '../src/services/collection/mappers';
import { colors, radius, spacing } from '../src/theme';
import { useCollectionFilters } from '../src/contexts/CollectionFiltersContext';
import { CollectionFiltersPanel } from '../src/components/collection/CollectionFiltersPanel';
import { applyCollectionFilters, availableCollectionFilters } from '../src/utils/collectionFilters';
import { calculateCollectionStats } from '../src/utils/collectionStats';

export default function CollectionScreen() {
  const router = useRouter();
  const collection = useCollection();
  const { added } = useLocalSearchParams<{ added?: string }>();
  const { filters, setFilters, search, setSearch, active, reset } = useCollectionFilters();
  const openItem = useCallback((id: string) => {
    router.push({ pathname: '/collection/[id]', params: { id } });
  }, [router]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [view, setView] = useState<CollectionView>('grid');
  const stats = useMemo(() => calculateCollectionStats(collection.data ?? []), [collection.data]);
  const counts = { ALL: stats.total, ...stats.formats };
  const options = useMemo(() => availableCollectionFilters(collection.data ?? []), [collection.data]);
  const items = useMemo(() => applyCollectionFilters(collection.data ?? [], search, filters).map(mapCollectionCard), [collection.data, search, filters]);
  useEffect(() => {
    if (!added) return;
    reset(); setView('grid');
    router.setParams({ added: undefined });
  }, [added, router, reset]);

  return (
    <Screen edges={['top', 'left', 'right']} style={styles.screen}>
      <CollectionBrandHeader />
      <View style={styles.content}>
        <MovieGrid
          items={items}
          onItemPress={openItem}
          emptyState={collection.isPending ? <ActivityIndicator accessibilityLabel="Carregando coleção" color={colors.accent} /> : collection.isError ? (
            <View style={styles.header}>
              <AppText color="textMuted">Não foi possível carregar a coleção</AppText>
              <ActionButton label="Tentar novamente" onPress={() => { void collection.refetch(); }} />
            </View>
          ) : <AppText color="textMuted" style={styles.empty}>{stats.total ? 'Nenhum item encontrado' : 'Nenhum item no Acervo'}</AppText>}
          header={
            <View style={styles.header}>
              <CollectionHeader count={counts.ALL} />
              <CollectionSearchBar value={search} onChangeText={setSearch} />
              <CollectionToolbar sort={filters.sort} onSortChange={(sort) => setFilters((current) => ({ ...current, sort }))} view={view} onViewChange={setView} filtersActive={active} onFiltersPress={() => { Keyboard.dismiss(); setFiltersOpen(true); }} />
              <FormatFilterBar formats={filters.formats} counts={counts} onChange={(format) => setFilters((current) => ({ ...current, formats: format === 'ALL' ? [] : [format] }))} />
            </View>
          }
          footer={items.length ? (
            <View style={styles.footer}>
              <View style={styles.handle} />
              <AppText variant="caption" color="textMuted">{items.length} {items.length === 1 ? 'item' : 'itens'} no seu acervo</AppText>
            </View>
          ) : undefined}
        />
      </View>
      <BottomNavigation count={counts.ALL} onCollectionPress={() => { reset(); setView('grid'); }} onAddPress={() => router.navigate('/add')} onProfilePress={() => router.navigate('/profile')} />
      {filtersOpen && <CollectionFiltersPanel filters={filters} options={options} onApply={(next) => { setFilters(next); setFiltersOpen(false); }} onClear={reset} onClose={() => setFiltersOpen(false)} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 0 },
  content: { flex: 1, paddingHorizontal: spacing.page },
  header: { gap: spacing.md, paddingTop: spacing.lg, paddingBottom: spacing.md },
  empty: { textAlign: 'center', paddingVertical: spacing.xl },
  footer: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  handle: { width: spacing.xl, height: spacing.xs, borderRadius: radius.full, backgroundColor: colors.surfaceActive },
});
