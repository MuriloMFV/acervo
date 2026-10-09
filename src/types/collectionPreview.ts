import type { ImageSourcePropType } from 'react-native';

export type MediaFormat = 'DVD' | 'BLURAY' | 'UHD_4K' | 'VHS';

// Presentation-only shape; not the future Movie/Edition/CollectionItem schema.
export interface CollectionPreviewItem {
  id: string;
  title: string;
  year: number | null;
  poster: ImageSourcePropType | null;
  mediaFormat: MediaFormat;
  editionLabel?: string;
  kind?: 'box';
  movieCount?: number;
}
