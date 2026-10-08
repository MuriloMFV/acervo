import type { MediaFormat } from '../services/supabase/types';
export interface EditionCoverCandidate {
  id: string;
  thumbnailUrl: string;
  imageUrl: string;
  sourceUrl: string | null;
  sourceTitle: string;
  width?: number;
  height?: number;
  copyToken: string;
}
export interface CoverSearchParams {
  title: string;
  mediaFormat: MediaFormat;
  barcode?: string;
  editionName?: string;
  publisher?: string;
  country?: string;
  region?: string;
}
