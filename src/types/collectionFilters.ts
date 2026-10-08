import type { ItemCondition, MediaFormat } from '../services/supabase/types';

export type CollectionSort = 'RECENT' | 'OLDEST' | 'TITLE_ASC' | 'TITLE_DESC' | 'YEAR_DESC' | 'YEAR_ASC' | 'PRICE_DESC' | 'PRICE_ASC';
export type EditionFilter = 'STEELBOOK' | 'DIGIPAK' | 'BOX' | 'SPECIAL' | 'LIMITED';
export type CollectionShortcut = 'FAVORITES' | 'SPECIAL_EDITIONS' | 'RECENT';

export interface CollectionFilters {
  sort: CollectionSort;
  formats: MediaFormat[];
  editions: EditionFilter[];
  genres: string[];
  decades: number[];
  conditions: ItemCondition[];
  regions: string[];
  favoritesOnly: boolean;
  specialOnly: boolean;
}
