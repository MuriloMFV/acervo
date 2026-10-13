import { getSupabaseClient } from '../supabase/client';
import { authenticatedUserId, createCollectionCopy, findOrCreateMovie } from '../collection';
import { findEditionByBarcode } from '../editions';
import { isCollectionItemId } from '../collection/mappers';
import { validatedBarcode } from '../../utils/barcode';
import type { ItemCondition } from '../supabase/types';
import type { BarcodeEditionDraft } from '../../types/barcode';
import type { MovieForCollection } from '../collection/types';
import type { NewCopyDetails } from '../collection/registration';
import { assertSelectedCoverCompatible, assertCompatibleEdition, barcodeEditionPayload } from './mappers';
import { prepareBarcodeCopy } from './copy';
import { storedEditionCover } from '../covers/storage';

export async function addKnownBarcodeEdition(editionId: string, condition: ItemCondition, coverCorrection: boolean, details: NewCopyDetails = {}) {
  const copy = prepareBarcodeCopy(condition, details, coverCorrection);
  const userId = await authenticatedUserId();
  if (!isCollectionItemId(editionId)) throw new Error('Edição inválida.');
  const { data, error } = await getSupabaseClient().from('editions').select('id').eq('id', editionId).single();
  if (error) throw error;
  return createCollectionCopy(data.id, condition, userId, copy.notes, copy);
}
export async function addNewBarcodeEdition(code: string, movie: MovieForCollection, draft: BarcodeEditionDraft, condition: ItemCondition, coverRejected = false, details: NewCopyDetails = {}) {
  // Reject invalid personal fields before creating any catalog records.
  const copy = prepareBarcodeCopy(condition, details);
  const userId = await authenticatedUserId();
  const barcode = validatedBarcode(code);
  const backCoverUrl = storedEditionCover(draft.backCoverUrl, getSupabaseClient().storage.from('edition-covers').getPublicUrl('').data.publicUrl);
  // Never overwrite shared catalog metadata. A matching existing edition wins.
  let existing = await findEditionByBarcode(barcode);
  if (existing) {
    assertCompatibleEdition(existing, movie.id, draft.mediaFormat);
    assertSelectedCoverCompatible(existing, draft.customCoverUrl, backCoverUrl);
    const fields = prepareBarcodeCopy(condition, details, coverRejected && !!existing.product_image_url);
    return createCollectionCopy(existing.id, condition, userId, fields.notes, fields);
  }
  const savedMovie = await findOrCreateMovie(movie);
  // Movie lookup/insertion can take time: check the barcode again before INSERT.
  existing = await findEditionByBarcode(barcode);
  if (existing) {
    assertCompatibleEdition(existing, movie.id, draft.mediaFormat);
    assertSelectedCoverCompatible(existing, draft.customCoverUrl, backCoverUrl);
    const fields = prepareBarcodeCopy(condition, details, coverRejected && !!existing.product_image_url);
    return createCollectionCopy(existing.id, condition, userId, fields.notes, fields);
  }
  if (await authenticatedUserId() !== userId) throw new Error('Sessão alterada.');
  const { data, error } = await getSupabaseClient().from('editions').insert(barcodeEditionPayload(savedMovie.id, barcode, { ...draft, backCoverUrl })).select('id').single();
  if (error) throw error;
  return createCollectionCopy(data.id, condition, userId, copy.notes, copy);
}
