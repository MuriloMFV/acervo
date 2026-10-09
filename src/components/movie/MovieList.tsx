import { useCallback } from 'react';
import { FlatList, StyleSheet, View, type ListRenderItem } from 'react-native';
import { spacing } from '../../theme';
import type { CollectionPreviewItem } from '../../types/collectionPreview';
import type { MovieGridProps } from './MovieGrid';
import { MovieListRow } from './MovieListRow';

const keyExtractor = (item: CollectionPreviewItem) => item.id;
const Separator = () => <View style={styles.separator} />;

export function MovieList({ items, header, footer, emptyState, onItemPress }: MovieGridProps) {
  const renderItem = useCallback<ListRenderItem<CollectionPreviewItem>>(
    ({ item }) => <MovieListRow item={item} onPress={onItemPress} />,
    [onItemPress],
  );
  return <FlatList
    style={styles.list}
    data={items}
    renderItem={renderItem}
    keyExtractor={keyExtractor}
    ItemSeparatorComponent={Separator}
    contentContainerStyle={styles.content}
    ListHeaderComponent={header}
    ListFooterComponent={footer}
    ListEmptyComponent={emptyState}
    keyboardShouldPersistTaps="handled"
    keyboardDismissMode="on-drag"
    initialNumToRender={12}
    maxToRenderPerBatch={12}
    windowSize={7}
  />;
}

const styles = StyleSheet.create({
  list: { flex: 1 },
  separator: { height: spacing.sm },
  content: { paddingBottom: spacing.lg },
});
