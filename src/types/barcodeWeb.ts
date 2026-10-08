import type { MediaFormat } from '../services/supabase/types.ts';
export interface BarcodeWebCandidate {
  id: string;
  title: string;
  snippet: string;
  sourceUrl: string;
  sourceDomain: string;
  imageUrl: string | null;
  detectedTitle: string | null;
  detectedFormat: MediaFormat | null;
  detectedPublisher: string | null;
  detectedCountry: string | null;
  detectedRegion: string | null;
  detectedEditionName: string | null;
  confidenceHints: string[];
}
