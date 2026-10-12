import type { CollectionRecord } from '../services/collection/types';
import type { CollectionBoxRecord } from '../services/boxes/types';
import type { ItemCondition, MediaFormat } from '../services/supabase/types';
import type { CollectionFilters, CollectionShortcut, CollectionSort, EditionFilter } from '../types/collectionFilters';
import { regionEncodingDraft } from './videoStandard.ts';
import type { VideoStandard } from '../types/videoStandard';

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
function regionValues(metadata: { region: string | null; video_standard?: VideoStandard | null }): string[] {
  const selection = regionEncodingDraft(metadata.region?.trim() ?? '', metadata.video_standard);
  return [selection.region, selection.videoStandard].filter((value): value is string => !!value);
}
function matchesPhysicalItem(metadata: {
  media_format: MediaFormat; region: string | null; video_standard?: VideoStandard | null;
  is_special_edition: boolean; is_limited_edition: boolean;
}, copy: { condition: ItemCondition; is_favorite: boolean }, packaging: string, filters: CollectionFilters): boolean {
  if (filters.formats.length && !filters.formats.includes(metadata.media_format)) return false;
  if (filters.editions.length && !filters.editions.some(selected => {
    if (selected === 'SPECIAL') return metadata.is_special_edition;
    if (selected === 'LIMITED') return metadata.is_limited_edition;
    return packaging === selected;
  })) return false;
  if (filters.conditions.length && !filters.conditions.includes(copy.condition)) return false;
  if (filters.regions.length && !regionValues(metadata).some(value => filters.regions.includes(value))) return false;
  if (filters.favoritesOnly && !copy.is_favorite) return false;
  if (filters.specialOnly && !metadata.is_special_edition && !metadata.is_limited_edition) return false;
  return true;
}
function compareNullable(a: number | null, b: number | null, descending: boolean): number {
  if (a === null) return b === null ? 0 : 1;
  if (b === null) return -1;
  return descending ? b - a : a - b;
}
export interface CollectionSortValues {
  id: string; title: string; year: number | null; price: number | null; createdAt: string;
}
export function compareCollectionItems(a: CollectionSortValues, b: CollectionSortValues, sort: CollectionSort): number {
  const addedTime = (value: string) => { const time = Date.parse(value); return Number.isFinite(time) ? time : null; };
  let order = 0;
  if (sort === 'TITLE_ASC' || sort === 'TITLE_DESC') order = collectionCollator.compare(a.title, b.title) * (sort === 'TITLE_DESC' ? -1 : 1);
  else if (sort === 'YEAR_ASC' || sort === 'YEAR_DESC') order = compareNullable(a.year, b.year, sort === 'YEAR_DESC');
  else if (sort === 'PRICE_ASC' || sort === 'PRICE_DESC') order = compareNullable(a.price, b.price, sort === 'PRICE_DESC');
  else order = compareNullable(addedTime(a.createdAt), addedTime(b.createdAt), sort === 'RECENT');
  return order || compareLabels(a.title, b.title) || compareLabels(a.id, b.id);
}
export function applyCollectionFilters(items: readonly CollectionRecord[], search: string, filters: CollectionFilters): CollectionRecord[] {
  const text = search.trim().toLocaleLowerCase('pt-BR');
  const result = items.filter((item) => {
    const edition = item.edition;
    const movie = edition.movie;
    if (text && !movie.title.toLocaleLowerCase('pt-BR').includes(text)) return false;
    if (filters.genres.length && !movie.genres.some((genre) => filters.genres.includes(genre.trim()))) return false;
    const decade = releaseDecade(movie.release_year);
    if (filters.decades.length && (decade === null || !filters.decades.includes(decade))) return false;
    return matchesPhysicalItem(edition, item, edition.packaging_type, filters);
  });
  const values = (item: CollectionRecord): CollectionSortValues => ({ id: item.id, title: item.edition.movie.title, year: item.edition.movie.release_year, price: item.purchase_price, createdAt: item.created_at });
  return result.sort((a, b) => compareCollectionItems(values(a), values(b), filters.sort));
}
export function applyCollectionBoxFilters(items: readonly CollectionBoxRecord[], search: string, filters: CollectionFilters): CollectionBoxRecord[] {
  // A box has no film genre or release decade of its own. Do not flatten its films.
  if (filters.genres.length || filters.decades.length) return [];
  const text = search.trim().toLocaleLowerCase('pt-BR');
  const values = (item: CollectionBoxRecord): CollectionSortValues => ({ id: `box:${item.id}`, title: item.box_set.name, year: null, price: item.purchase_price, createdAt: item.created_at });
  return items.filter(item => (!text || item.box_set.name.toLocaleLowerCase('pt-BR').includes(text))
    && matchesPhysicalItem(item.box_set, item, 'BOX', filters))
    .sort((a, b) => compareCollectionItems(values(a), values(b), filters.sort));
}
export function availableCollectionFilters(items: readonly CollectionRecord[], boxes: readonly CollectionBoxRecord[] = []) {
  const genres = new Set<string>(); const regions = new Set<string>();
  const decades = new Set([2020, 2010, 2000, 1990, 1980, 1970]);
  for (const { edition } of items) {
    edition.movie.genres.forEach((value) => { if (value.trim()) genres.add(value.trim()); });
    regionValues(edition).forEach(value => regions.add(value));
    const decade = releaseDecade(edition.movie.release_year);
    if (decade !== null) decades.add(decade);
  }
  for (const { box_set } of boxes) regionValues(box_set).forEach(value => regions.add(value));
  return { genres: [...genres].sort(compareLabels), regions: [...regions].sort(compareLabels), decades: [...decades].sort((a, b) => b - a) };
}
