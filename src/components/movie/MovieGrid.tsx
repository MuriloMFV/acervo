import { useCallback, useState, type ReactElement } from 'react';
import { FlatList, StyleSheet, View, type ListRenderItem } from 'react-native';
import { spacing } from '../../theme';
import { movieLayout } from '../../theme/media';
import type { CollectionPreviewItem } from '../../types/collectionPreview';
import { MovieCard } from './MovieCard';

export interface MovieGridProps {
  items: readonly CollectionPreviewItem[];
  header?: ReactElement;
  footer?: ReactElement;
  emptyState?: ReactElement;
  onItemPress?: (id: string) => void;
}

const keyExtractor = (item: CollectionPreviewItem) => item.id;

export function MovieGrid({ items, header, footer, emptyState, onItemPress }: MovieGridProps) {
  const [width, setWidth] = useState(0);
  const cardWidth = Math.max(0, (width - spacing.sm * (movieLayout.columns - 1)) / movieLayout.columns);
  const renderItem = useCallback<ListRenderItem<CollectionPreviewItem>>(
    ({ item }) => cardWidth > 0 ? <MovieCard item={item} width={cardWidth} onPress={onItemPress} /> : null,
    [cardWidth, onItemPress],
  );

  return (
    <View style={styles.container} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        numColumns={movieLayout.columns}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.content}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        ListEmptyComponent={emptyState}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={7}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  row: { gap: spacing.sm, marginBottom: spacing.md },
  content: { paddingBottom: spacing.lg },
});
