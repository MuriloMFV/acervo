import type { CollectionItemRow, EditionRow, MovieRow, ItemCondition, PackagingType } from '../supabase/types';
import type { MovieDetails } from '../../types/movieSearch';

// Signed URL exists only in memory, never in the database.
export type CollectionRecord = CollectionItemRow & { photo_cover_url?: string | null; edition: EditionRow & { movie: MovieRow } };
export type MovieForCollection = MovieDetails;
export interface NewEditionDetails {
  editionName?: string; publisher?: string; region?: string; country?: string;
  packagingType?: PackagingType;
  customCoverUrl?: string | null; backCoverUrl?: string | null;
}
export type CopyUpdate = Pick<CollectionItemRow, 'condition' | 'purchase_price' | 'purchase_date' | 'purchase_place' | 'notes'> & { is_favorite?: boolean; use_photo_as_cover?: boolean };
export interface CopyFormValues {
  condition: ItemCondition;
  price: string;
  date: string;
  place: string;
  notes: string;
  favorite?: boolean;
  usePhotoAsCover?: boolean;
}
