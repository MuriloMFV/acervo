import type { CollectionRecord } from '../services/collection/types';
import type { CollectionFilters, CollectionShortcut, CollectionSort, EditionFilter } from '../types/collectionFilters';

export const collectionSortOptions: { value: CollectionSort; label: string; shortLabel: string }[] = [
  { value: 'RECENT', label: 'Adicionados recentemente', shortLabel: 'Recentes' },
  { value: 'OLDEST', label: 'Adicionados primeiro', shortLabel: 'Primeiros' },
  { value: 'TITLE_ASC', label: 'Título A–Z', shortLabel: 'A–Z' },
  { value: 'TITLE_DESC', label: 'Título Z–A', shortLabel: 'Z–A' },
  { value: 'YEAR_DESC', label: 'Ano mais recente', shortLabel: 'Ano ↓' },
  { value: 'YEAR_ASC', label: 'Ano mais antigo', shortLabel: 'Ano ↑' },
  { value: 'PRICE_DESC', label: 'Maior valor pago', shortLabel: 'Preço ↓' },
  { value: 'PRICE_ASC', label: 'Menor valor pago', shortLabel: 'Preço ↑' },
];
export const editionFilterLabels: Record<EditionFilter, string> = { STEELBOOK: 'SteelBook', DIGIPAK: 'Digipak', BOX: 'Box', SPECIAL: 'Edição especial', LIMITED: 'Edição limitada' };
export const collectionCollator = new Intl.Collator('pt-BR', { sensitivity: 'base' });
export function compareLabels(a: string, b: string): number {
  return collectionCollator.compare(a, b) || (a < b ? -1 : a > b ? 1 : 0);
}
export function defaultCollectionFilters(): CollectionFilters {
  return { sort: 'RECENT', formats: [], editions: [], genres: [], decades: [], conditions: [], regions: [], favoritesOnly: false, specialOnly: false };
}
export function hasActiveFilters(filters: CollectionFilters): boolean {
  return filters.favoritesOnly || filters.specialOnly || [filters.formats, filters.editions, filters.genres, filters.decades, filters.conditions, filters.regions].some((values) => values.length > 0);
}
export function toggleFilterValue<T>(values: readonly T[], value: T): T[] {
  return values.includes(value) ? values.filter((current) => current !== value) : [...values, value];
}
export function filtersForShortcut(shortcut: CollectionShortcut): CollectionFilters {
  return { ...defaultCollectionFilters(), favoritesOnly: shortcut === 'FAVORITES', specialOnly: shortcut === 'SPECIAL_EDITIONS' };
}
export function releaseDecade(year: number | null): number | null {
  return year !== null && Number.isInteger(year) && year > 0 ? Math.floor(year / 10) * 10 : null;
}
function matchesEdition(item: CollectionRecord, selected: EditionFilter): boolean {
  if (selected === 'SPECIAL') return item.edition.is_special_edition;
  if (selected === 'LIMITED') return item.edition.is_limited_edition;
  return item.edition.packaging_type === selected;
}
function compareNullable(a: number | null, b: number | null, descending: boolean): number {
  if (a === null) return b === null ? 0 : 1;
  if (b === null) return -1;
  return descending ? b - a : a - b;
}
function addedTime(item: CollectionRecord): number | null {
  const time = Date.parse(item.created_at);
  return Number.isFinite(time) ? time : null;
}
export function applyCollectionFilters(items: readonly CollectionRecord[], search: string, filters: CollectionFilters): CollectionRecord[] {
  const text = search.trim().toLocaleLowerCase('pt-BR');
  const result = items.filter((item) => {
    const edition = item.edition;
    const movie = edition.movie;
    if (text && !movie.title.toLocaleLowerCase('pt-BR').includes(text)) return false;
    if (filters.formats.length && !filters.formats.includes(edition.media_format)) return false;
    if (filters.editions.length && !filters.editions.some((value) => matchesEdition(item, value))) return false;
    if (filters.genres.length && !movie.genres.some((genre) => filters.genres.includes(genre.trim()))) return false;
    const decade = releaseDecade(movie.release_year);
    if (filters.decades.length && (decade === null || !filters.decades.includes(decade))) return false;
    if (filters.conditions.length && !filters.conditions.includes(item.condition)) return false;
    if (filters.regions.length && !filters.regions.includes(edition.region?.trim() ?? '')) return false;
    if (filters.favoritesOnly && !item.is_favorite) return false;
    if (filters.specialOnly && !edition.is_special_edition && !edition.is_limited_edition) return false;
    return true;
  });
  const sort = filters.sort;
  return result.sort((a, b) => {
    let order = 0;
    if (sort === 'TITLE_ASC' || sort === 'TITLE_DESC') order = collectionCollator.compare(a.edition.movie.title, b.edition.movie.title) * (sort === 'TITLE_DESC' ? -1 : 1);
    else if (sort === 'YEAR_ASC' || sort === 'YEAR_DESC') order = compareNullable(a.edition.movie.release_year, b.edition.movie.release_year, sort === 'YEAR_DESC');
    else if (sort === 'PRICE_ASC' || sort === 'PRICE_DESC') order = compareNullable(a.purchase_price, b.purchase_price, sort === 'PRICE_DESC');
    else order = compareNullable(addedTime(a), addedTime(b), sort === 'RECENT');
    return order || compareLabels(a.edition.movie.title, b.edition.movie.title) || compareLabels(a.id, b.id);
  });
}
export function availableCollectionFilters(items: readonly CollectionRecord[]) {
  const genres = new Set<string>(); const regions = new Set<string>();
  const decades = new Set([2020, 2010, 2000, 1990, 1980, 1970]);
  for (const { edition } of items) {
    edition.movie.genres.forEach((value) => { if (value.trim()) genres.add(value.trim()); });
    if (edition.region?.trim()) regions.add(edition.region.trim());
    const decade = releaseDecade(edition.movie.release_year);
    if (decade !== null) decades.add(decade);
  }
  return { genres: [...genres].sort(compareLabels), regions: [...regions].sort(compareLabels), decades: [...decades].sort((a, b) => b - a) };
}
