import type { CollectionPreviewItem, MediaFormat } from '../types/collectionPreview';
import type { CollectionSort } from '../types/collectionFilters';
import { collectionCollator as titleCollator } from './collectionFilters.ts';

export type { CollectionSort } from '../types/collectionFilters';
export { collectionSortOptions } from './collectionFilters.ts';

export type FormatFilter = 'ALL' | MediaFormat;
// Historical mock helper; authenticated screens use applyCollectionFilters.
type PreviewSort = Exclude<CollectionSort, 'OLDEST' | 'PRICE_DESC' | 'PRICE_ASC'>;

export function selectCollectionPreview(
  items: readonly CollectionPreviewItem[], search: string, format: FormatFilter, sort: PreviewSort,
): CollectionPreviewItem[] {
  const query = search.trim().toLocaleLowerCase('pt-BR');
  const result = items.filter((item) =>
    (format === 'ALL' || item.mediaFormat === format) &&
    item.title.toLocaleLowerCase('pt-BR').includes(query),
  );
  // The source is newest first. Filtering preserves that order.
  if (sort === 'RECENT') return result;
  return result.sort((a, b) => {
    if (sort === 'TITLE_ASC') return titleCollator.compare(a.title, b.title);
    if (sort === 'TITLE_DESC') return titleCollator.compare(b.title, a.title);
    if (a.year === null) return b.year === null ? 0 : 1;
    if (b.year === null) return -1;
    return sort === 'YEAR_DESC' ? b.year - a.year : a.year - b.year;
  });
}

export function countCollectionFormats(items: readonly CollectionPreviewItem[]): Record<FormatFilter, number> {
  const counts = { ALL: items.length, DVD: 0, BLURAY: 0, UHD_4K: 0, VHS: 0 };
  for (const item of items) counts[item.mediaFormat] += 1;
  return counts;
}
