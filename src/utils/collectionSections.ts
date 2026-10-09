import type { CollectionPreviewItem } from '../types/collectionPreview';
import type { CollectionSort } from '../types/collectionFilters';

export interface MovieGridRow { key: string; items: readonly CollectionPreviewItem[] }
export interface MovieGridSection { key: string; label: string | null; data: MovieGridRow[] }

export function collectionSectionLabel(item: CollectionPreviewItem, sort: CollectionSort): string | null {
  if (sort === 'TITLE_ASC' || sort === 'TITLE_DESC') {
    const initial = item.title.trim().normalize('NFD').replace(/\p{M}/gu, '').toLocaleUpperCase('pt-BR').charAt(0);
    return /^[A-Z]$/.test(initial) ? initial : '#';
  }
  if (sort === 'YEAR_ASC' || sort === 'YEAR_DESC') return item.year === null ? 'Sem ano' : String(item.year);
  return null;
}

// Consume the already filtered/sorted collection; presentation never reorders it.
// Stable sections and row keys map directly to SectionList.scrollToLocation later.
export function collectionGridSections(items: readonly CollectionPreviewItem[], sort: CollectionSort): MovieGridSection[] {
  const sections: MovieGridSection[] = [];
  for (const item of items) {
    const label = collectionSectionLabel(item, sort);
    let section = sections.at(-1);
    if (!section || section.label !== label) {
      section = { key: `${label ?? 'collection'}:${item.id}`, label, data: [] };
      sections.push(section);
    }
    let row = section.data.at(-1);
    if (!row || row.items.length === 3) {
      row = { key: item.id, items: [item] };
      section.data.push(row);
    } else {
      row.items = [...row.items, item];
    }
  }
  return sections;
}
