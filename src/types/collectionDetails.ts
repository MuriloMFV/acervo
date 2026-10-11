import type { ImageSourcePropType } from 'react-native';
import type { MediaFormat } from './collectionPreview';

export type ItemCondition = 'SEALED' | 'LIKE_NEW' | 'VERY_GOOD' | 'GOOD' | 'FAIR';
export type PackagingType = 'STANDARD' | 'SNAPCASE' | 'DIGIPAK' | 'STEELBOOK' | 'SLIPCASE' | 'BOX';

// Minimal view models, not database entities or migrations.
export interface MovieDetailsPreview {
  title: string;
  originalTitle: string;
  year: number | null;
  director: string;
  genres: readonly string[];
  runtime: number | null;
  overview: string;
  poster: ImageSourcePropType | null;
  backdrop: ImageSourcePropType | null;
}

export interface EditionDetailsPreview {
  backCover?: ImageSourcePropType | null;
  mediaFormat: MediaFormat;
  region: string | null;
  country: string | null;
  publisher: string | null;
  barcode: string | null;
  packagingType?: PackagingType;
  editionName?: string;
  discCount?: number | null;
}

export interface CollectionItemDetailsPreview {
  id: string;
  movie: MovieDetailsPreview;
  edition: EditionDetailsPreview;
  copy: {
    condition: ItemCondition;
    purchasePrice: number | null;
    purchaseDate: string | null;
    favorite: boolean;
    purchasePlace?: string | null;
    notes?: string | null;
  };
}
