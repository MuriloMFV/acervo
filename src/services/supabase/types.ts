// Matches the initial migration. Regenerate from Supabase after applying it.
// Preview/mock types remain separate from persistence.
export type MediaFormat = 'DVD' | 'BLURAY' | 'UHD_4K' | 'VHS';
export type PackagingType = 'STANDARD' | 'STEELBOOK' | 'DIGIPAK' | 'BOX';
export type ItemCondition = 'SEALED' | 'LIKE_NEW' | 'VERY_GOOD' | 'GOOD' | 'FAIR';

type Timestamps = { created_at: string; updated_at: string };
export type ProfileRow = Timestamps & {
  id: string;
  display_name: string;
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
  country: string | null;
  edition_name: string | null;
  product_image_url: string | null;
  custom_cover_url: string | null;
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
}

type Relation<Name extends string, Column extends string, Target extends string> = {
  foreignKeyName: Name; columns: [Column]; isOneToOne: false;
  referencedRelation: Target; referencedColumns: ['id'];
};
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
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { media_format: MediaFormat; packaging_type: PackagingType; item_condition: ItemCondition };
    CompositeTypes: { [_ in never]: never };
  };
}
