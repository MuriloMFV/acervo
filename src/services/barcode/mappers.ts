import type { BarcodeEditionDraft, KnownEdition } from '../../types/barcode';
import type { Database, MediaFormat } from '../supabase/types';
import { validatedBarcode } from '../../utils/barcode.ts';

export class EditionConflictError extends Error {
  constructor() { super('Uma edição foi cadastrada para este código. Consulte novamente para confirmar.'); this.name = 'EditionConflictError'; }
}
export function assertSelectedCoverCompatible(edition: KnownEdition, customCoverUrl?: string | null, backCoverUrl?: string | null) {
  if ((customCoverUrl && edition.custom_cover_url !== customCoverUrl) || (backCoverUrl && edition.back_cover_url !== backCoverUrl)) throw new EditionConflictError();
}
export const coverCorrectionNote = 'Capa da edição marcada para correção.';
export function assertCompatibleEdition(edition: KnownEdition, tmdbId: string, format: MediaFormat) {
  if (String(edition.movie.tmdb_id) !== tmdbId || edition.media_format !== format) throw new EditionConflictError();
}
export function barcodeEditionPayload(movieId: string, code: string, draft: BarcodeEditionDraft): Database['public']['Tables']['editions']['Insert'] {
  return {
    movie_id: movieId, barcode: validatedBarcode(code), media_format: draft.mediaFormat, packaging_type: draft.packagingType,
    publisher: draft.publisher.trim() || null, region: draft.region.trim() || null, country: draft.country.trim() || null,
    edition_name: draft.editionName.trim() || null, product_image_url: draft.productImageUrl, custom_cover_url: draft.customCoverUrl ?? null,
    ...(draft.backCoverUrl === undefined ? {} : { back_cover_url: draft.backCoverUrl?.trim() || null }),
    is_special_edition: draft.isSpecialEdition, is_limited_edition: draft.isLimitedEdition,
  };
}
