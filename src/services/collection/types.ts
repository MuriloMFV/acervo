import type { CollectionItemRow, EditionRow, MovieRow, ItemCondition } from '../supabase/types';
import type { MovieDetails } from '../../types/movieSearch';

export type CollectionRecord = CollectionItemRow & { edition: EditionRow & { movie: MovieRow } };
export type MovieForCollection = MovieDetails;
export type CopyUpdate = Pick<CollectionItemRow, 'condition' | 'purchase_price' | 'purchase_date' | 'purchase_place' | 'notes'>;
export interface CopyFormValues {
  condition: ItemCondition;
  price: string;
  date: string;
  place: string;
  notes: string;
}
