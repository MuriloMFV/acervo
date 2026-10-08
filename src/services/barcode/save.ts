import { getSupabaseClient } from '../supabase/client';
import { authenticatedUserId, createCollectionCopy, findOrCreateMovie } from '../collection';
import { findEditionByBarcode } from '../editions';
import { isCollectionItemId } from '../collection/mappers';
import { validatedBarcode } from '../../utils/barcode';
import type { ItemCondition } from '../supabase/types';
import type { BarcodeEditionDraft } from '../../types/barcode';
import type { MovieForCollection } from '../collection/types';
import { assertSelectedCoverCompatible, assertCompatibleEdition, barcodeEditionPayload, coverCorrectionNote } from './mappers';

export async function addKnownBarcodeEdition(editionId: string, condition: ItemCondition, coverCorrection: boolean) {
  const userId = await authenticatedUserId();
  if (!isCollectionItemId(editionId)) throw new Error('Edição inválida.');
  const { data, error } = await getSupabaseClient().from('editions').select('id').eq('id', editionId).single();
  if (error) throw error;
  return createCollectionCopy(data.id, condition, userId, coverCorrection ? coverCorrectionNote : null);
}
export async function addNewBarcodeEdition(code: string, movie: MovieForCollection, draft: BarcodeEditionDraft, condition: ItemCondition, coverRejected = false) {
  const userId = await authenticatedUserId();
  const barcode = validatedBarcode(code);
  // Never overwrite shared catalog metadata. A matching existing edition wins.
  let existing = await findEditionByBarcode(barcode);
  if (existing) {
    assertCompatibleEdition(existing, movie.id, draft.mediaFormat);
    assertSelectedCoverCompatible(existing, draft.customCoverUrl);
    return createCollectionCopy(existing.id, condition, userId, coverRejected && existing.product_image_url ? coverCorrectionNote : null);
  }
  const savedMovie = await findOrCreateMovie(movie);
  // Movie lookup/insertion can take time: check the barcode again before INSERT.
  existing = await findEditionByBarcode(barcode);
  if (existing) {
    assertCompatibleEdition(existing, movie.id, draft.mediaFormat);
    assertSelectedCoverCompatible(existing, draft.customCoverUrl);
    return createCollectionCopy(existing.id, condition, userId, coverRejected && existing.product_image_url ? coverCorrectionNote : null);
  }
  if (await authenticatedUserId() !== userId) throw new Error('Sessão alterada.');
  const { data, error } = await getSupabaseClient().from('editions').insert(barcodeEditionPayload(savedMovie.id, barcode, draft)).select('id').single();
  if (error) throw error;
  return createCollectionCopy(data.id, condition, userId);
}
