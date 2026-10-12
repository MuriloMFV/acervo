import type { MediaFormat } from '../services/supabase/types';

export interface FrequentValue { label: string; count: number }
export interface CollectionStats {
  total: number;
  individualMovies: number;
  boxes: number;
  totalMovies: number;
  formats: Record<MediaFormat, number>;
  genre: FrequentValue | null;
  decade: FrequentValue | null;
  director: FrequentValue | null;
  registeredValue: number;
  pricedItems: number;
  favorites: number;
  specialEditions: number;
}
