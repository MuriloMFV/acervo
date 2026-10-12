import { forwardRef, useCallback, useMemo, useState, type ReactElement } from 'react';
import { SectionList, StyleSheet, View, type SectionListRenderItem } from 'react-native';
import { colors, spacing } from '../../theme';
import { movieLayout } from '../../theme/media';
import type { CollectionPreviewItem } from '../../types/collectionPreview';
import type { CollectionSort } from '../../types/collectionFilters';
import { collectionGridSections, type MovieGridRow, type MovieGridSection } from '../../utils/collectionSections';
import { AppText } from '../ui';
import { MovieCard } from './MovieCard';

export interface MovieGridProps {
  items: readonly CollectionPreviewItem[];
  sort?: CollectionSort;
  header?: ReactElement;
  footer?: ReactElement;
  emptyState?: ReactElement;
  onItemPress?: (id: string) => void;
}
const keyExtractor = (row: MovieGridRow) => row.key;
const sectionHeader = ({ section }: { section: MovieGridSection }) => section.label === null ? null : (
  <View style={styles.sectionHeader}>
    <AppText accessibilityRole="header" variant="heading" color="textSecondary">{section.label}</AppText>
    <View style={styles.divider} />
  </View>
);

export const MovieGrid = forwardRef<SectionList<MovieGridRow, MovieGridSection>, MovieGridProps>(function MovieGrid({ items, sort = 'RECENT', header, footer, emptyState, onItemPress }, ref) {
  const [width, setWidth] = useState(0);
  const sections = useMemo(() => collectionGridSections(items, sort), [items, sort]);
  const cardWidth = Math.max(0, (width - spacing.sm * (movieLayout.columns - 1)) / movieLayout.columns);
  const renderItem = useCallback<SectionListRenderItem<MovieGridRow, MovieGridSection>>(
    ({ item: row }) => cardWidth > 0 ? <View style={styles.row}>{row.items.map(item => <MovieCard key={item.id} item={item} width={cardWidth} onPress={onItemPress} />)}</View> : null,
    [cardWidth, onItemPress],
  );
  return <View style={styles.container} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
    <SectionList<MovieGridRow, MovieGridSection>
      ref={ref}
      sections={sections}
      renderItem={renderItem}
      renderSectionHeader={sectionHeader}
      keyExtractor={keyExtractor}
      extraData={cardWidth}
      stickySectionHeadersEnabled={false}
      contentContainerStyle={styles.content}
      ListHeaderComponent={header}
      ListFooterComponent={footer}
      ListEmptyComponent={emptyState}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      initialNumToRender={5}
      maxToRenderPerBatch={5}
      windowSize={7}
    />
  </View>;
});
const styles = StyleSheet.create({
  container: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.xs, paddingTop: spacing.sm, paddingBottom: spacing.xs },
  divider: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  content: { paddingBottom: spacing.lg },
});
