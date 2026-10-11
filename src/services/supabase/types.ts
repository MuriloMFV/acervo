// Matches checked-in migrations. Regenerate from Supabase after applying them.
// Preview/mock types remain separate from persistence.
import type { VideoStandard } from '../../types/videoStandard';
export type MediaFormat = 'DVD' | 'BLURAY' | 'UHD_4K' | 'VHS';
export type PackagingType = 'STANDARD' | 'SNAPCASE' | 'DIGIPAK' | 'STEELBOOK' | 'SLIPCASE' | 'BOX';
export type ItemCondition = 'SEALED' | 'LIKE_NEW' | 'VERY_GOOD' | 'GOOD' | 'FAIR';

type Timestamps = { created_at: string; updated_at: string };
export type ProfileRow = Timestamps & {
  id: string;
  display_name: string;
  // Private profile-photos object key; signed URLs are generated for display.
  avatar_url: string | null;
}
export type MovieRow = Timestamps & {
  id: string;
  tmdb_id: number | null;
  title: string;
  original_title: string | null;
  release_year: number | null;
  overview: string | null;
  runtime: number | null;
  poster_url: string | null;
  backdrop_url: string | null;
  director: string | null;
  genres: string[];
}
export type EditionRow = Timestamps & {
  id: string;
  movie_id: string;
  barcode: string | null;
  media_format: MediaFormat;
  packaging_type: PackagingType;
  publisher: string | null;
  region: string | null;
  video_standard: VideoStandard | null;
  country: string | null;
  edition_name: string | null;
  product_image_url: string | null;
  custom_cover_url: string | null;
  back_cover_url: string | null;
  is_special_edition: boolean;
  is_limited_edition: boolean;
  disc_count: number | null;
  release_year: number | null;
}
export type CollectionItemRow = Timestamps & {
  id: string;
  user_id: string;
  edition_id: string;
  condition: ItemCondition;
  purchase_price: number | null;
  purchase_date: string | null;
  purchase_place: string | null;
  is_favorite: boolean;
  notes: string | null;
  photo_url: string | null;
  use_photo_as_cover: boolean;
}

type Relation<Name extends string, Column extends string, Target extends string> = {
  foreignKeyName: Name; columns: [Column]; isOneToOne: false;
  referencedRelation: Target; referencedColumns: ['id'];
};
export type BoxSetRow = Timestamps & {
  id: string; created_by: string; name: string; barcode: string | null; cover_url: string | null;
  media_format: MediaFormat; edition_name: string | null; publisher: string | null;
  country: string | null; region: string | null; video_standard: VideoStandard | null; disc_count: number | null;
  is_special_edition: boolean; is_limited_edition: boolean;
};
export type BoxSetMovieRow = { box_set_id: string; movie_id: string; position: number };
export type CollectionBoxRow = Timestamps & {
  id: string; user_id: string; box_set_id: string; condition: ItemCondition;
  purchase_price: number | null; purchase_date: string | null; purchase_place: string | null;
  notes: string | null; is_favorite: boolean;
};
export type BoxSetInput = Omit<BoxSetRow, keyof Timestamps | 'id' | 'created_by' | 'video_standard'> & { video_standard?: VideoStandard | null };
export type BoxCopyInput = Pick<CollectionBoxRow, 'condition' | 'purchase_price' | 'purchase_date' | 'purchase_place' | 'notes'>;
type Table<Row, Required extends keyof Row, Relationships extends object[] = []> = {
  Row: Row;
  Insert: Pick<Row, Required> & Partial<Omit<Row, Required>>;
  Update: Partial<Row>;
  Relationships: Relationships;
};

export interface Database {
  public: {
    Tables: {
      profiles: Table<ProfileRow, 'id'>;
      movies: Table<MovieRow, 'title'>;
      editions: Table<EditionRow, 'movie_id' | 'media_format', [Relation<'editions_movie_id_fkey', 'movie_id', 'movies'>]>;
      collection_items: Table<CollectionItemRow, 'user_id' | 'edition_id' | 'condition', [Relation<'collection_items_edition_id_fkey', 'edition_id', 'editions'>]>;
      box_sets: Table<BoxSetRow, 'created_by' | 'name' | 'media_format'>;
      box_set_movies: Table<BoxSetMovieRow, 'box_set_id' | 'movie_id' | 'position', [Relation<'box_set_movies_box_set_id_fkey', 'box_set_id', 'box_sets'>, Relation<'box_set_movies_movie_id_fkey', 'movie_id', 'movies'>]>;
      collection_boxes: Table<CollectionBoxRow, 'user_id' | 'box_set_id' | 'condition', [Relation<'collection_boxes_box_set_id_fkey', 'box_set_id', 'box_sets'>]>;
    };
    Views: { [_ in never]: never };
    Functions: {
      create_collection_box: { Args: { p_expected_user_id: string; p_box: BoxSetInput; p_movie_ids: string[]; p_copy: BoxCopyInput }; Returns: string };
      edit_collection_edition: { Args: { p_item_id: string; p_expected_edition_id: string; p_fields: { edition_name: string | null; publisher: string | null; country: string | null; region: string | null; disc_count: number | null; custom_cover_url: string | null; back_cover_url?: string | null; packaging_type?: PackagingType; video_standard?: VideoStandard | null } }; Returns: string }
    };
    Enums: { media_format: MediaFormat; packaging_type: PackagingType; item_condition: ItemCondition };
    CompositeTypes: { [_ in never]: never };
  };
}
