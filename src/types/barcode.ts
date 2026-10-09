import type { BarcodeWebCandidate } from './barcodeWeb';
import type { EditionRow, MovieRow, MediaFormat, PackagingType } from '../services/supabase/types';

export interface EditionCandidate {
  barcode: string;
  title: string | null;
  rawProductName: string | null;
  description: string | null;
  brand: string | null;
  publisher: string | null;
  images: string[];
  primaryImageUrl: string | null;
  source: 'UPCITEMDB';
}
export type KnownEdition = EditionRow & { movie: MovieRow };
export type BarcodeLookupResult =
  | { source: 'SUPABASE'; barcode: string; edition: KnownEdition }
  | { source: 'UPCITEMDB'; barcode: string; candidate: EditionCandidate }
  | { source: 'WEB'; barcode: string; candidates: BarcodeWebCandidate[] }
  | { source: 'NOT_FOUND'; barcode: string; webUnavailable?: boolean; webFailure?: import('../services/barcode/webErrors').BarcodeWebFailure };
export interface BarcodeEditionDraft {
  mediaFormat: MediaFormat;
  packagingType: PackagingType;
  publisher: string;
  region: string;
  country: string;
  editionName: string;
  productImageUrl: string | null;
  customCoverUrl?: string | null;
  isSpecialEdition: boolean;
  isLimitedEdition: boolean;
}
