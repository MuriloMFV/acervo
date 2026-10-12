import { getSupabaseClient } from '../supabase/client';
import type { MediaFormat, ItemCondition } from '../supabase/types';
import type { CollectionRecord, CopyUpdate, MovieForCollection, NewEditionDetails } from './types';
export type { NewEditionDetails } from './types';
import { copyPayload, editionPayload, isStandardEdition, isCollectionItemId, moviePayload } from './mappers';
import { prepareCollectionRegistration, persistCollectionRegistration, type NewCopyDetails } from './registration';
import { reuseOrCreate } from './reuse';
import { removeCopyPhoto } from '../photos';
import { storedEditionCover } from '../covers/storage';

const relations = '*,edition:editions!inner(*,movie:movies!inner(*))' as const;
export async function authenticatedUserId() {
  const { data, error } = await getSupabaseClient().auth.getSession();
  if (error || !data.session) throw new Error('Entre para continuar.');
  return data.session.user.id;
}
export async function listCollectionItems(signal?: AbortSignal): Promise<CollectionRecord[]> {
  const userId = await authenticatedUserId();
  let query = getSupabaseClient().from('collection_items').select(relations).eq('user_id', userId).order('created_at', { ascending: false }).order('id', { ascending: false });
  if (signal) query = query.abortSignal(signal);
  // Supabase caps each response; read pages so large collections are not cut off.
  const items: CollectionRecord[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await query.range(offset, offset + 499);
    if (error) throw error;
    items.push(...data);
    if (data.length < 500) return items;
  }
}
export async function getCollectionItem(id: string, signal?: AbortSignal): Promise<CollectionRecord | null> {
  const userId = await authenticatedUserId();
  if (!isCollectionItemId(id)) return null;
  let query = getSupabaseClient().from('collection_items').select(relations).eq('user_id', userId).eq('id', id);
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data;
}
export async function findOrCreateMovie(movie: MovieForCollection) {
  const client = getSupabaseClient();
  const payload = moviePayload(movie);
  return reuseOrCreate({
    retryUnique: true,
    find: async () => { const { data, error } = await client.from('movies').select('*').eq('tmdb_id', payload.tmdb_id!).maybeSingle(); if (error) throw error; return data; },
    insert: async () => { const { data, error } = await client.from('movies').insert(payload).select('*').single(); if (error) throw error; return data; },
  });
}
export async function createCollectionCopy(editionId: string, condition: ItemCondition, expectedUserId: string, notes: string | null = null, details?: CopyUpdate) {
  const userId = await authenticatedUserId();
  if (userId !== expectedUserId) throw new Error('Sessão alterada.');
  const { data, error } = await getSupabaseClient().from('collection_items').insert({ ...copyPayload(userId, editionId, condition, details), notes: details === undefined ? notes : details.notes }).select('id').single();
  if (error) throw error;
  return data;
}
export async function createCollectionItem(movie: MovieForCollection, format: MediaFormat, condition: ItemCondition, details: NewEditionDetails = {}, copyDetails: NewCopyDetails = {}) {
  // Validate the whole form before creating Movie, Edition or CollectionItem rows.
  const prepared = prepareCollectionRegistration(format, condition, details, copyDetails);
  const userId = await authenticatedUserId();
  const client = getSupabaseClient();
  const bucketUrl = client.storage.from('edition-covers').getPublicUrl('').data.publicUrl;
  prepared.edition.custom_cover_url = storedEditionCover(prepared.edition.custom_cover_url, bucketUrl);
  prepared.edition.back_cover_url = storedEditionCover(prepared.edition.back_cover_url, bucketUrl);
  return persistCollectionRegistration(movie, prepared, {
    movie: findOrCreateMovie,
    edition: async (movieId, fields) => {
      // Metadata identifies a distinct physical edition; shared catalog rows stay intact.
      if (fields.video_standard || fields.packaging_type !== 'STANDARD' || fields.is_special_edition || fields.is_limited_edition || fields.barcode || fields.disc_count != null || fields.custom_cover_url || fields.back_cover_url || [fields.edition_name, fields.publisher, fields.region, fields.country].some(value => value?.trim())) {
        const { data, error } = await client.from('editions').insert({ ...fields, movie_id: movieId }).select('id').single();
        if (error) throw error;
        return data;
      }
      return reuseOrCreate({
        find: async () => {
          const { data, error } = await client.from('editions').select('*').eq('movie_id', movieId).eq('media_format', format).eq('packaging_type', 'STANDARD').eq('is_special_edition', false).eq('is_limited_edition', false).is('barcode', null).is('custom_cover_url', null).is('back_cover_url', null).is('product_image_url', null).is('edition_name', null).is('publisher', null).is('region', null).is('video_standard', null).is('country', null).is('disc_count', null).is('release_year', null).order('created_at').limit(1);
          if (error) throw error;
          return data.find((row) => isStandardEdition(row, movieId, format)) ?? null;
        },
        insert: async () => { const { data, error } = await client.from('editions').insert(editionPayload(movieId, format)).select('*').single(); if (error) throw error; return data; },
      });
    },
    copy: (editionId, fields) => createCollectionCopy(editionId, condition, userId, fields.notes, fields),
  });
}
export async function updateCollectionItem(id: string, payload: CopyUpdate) {
  const userId = await authenticatedUserId();
  const { data, error } = await getSupabaseClient().from('collection_items').update(payload).eq('id', id).eq('user_id', userId).select('id').single();
  if (error) throw error;
  return data;
}
export async function updateFavorite(id: string, value: boolean) {
  const userId = await authenticatedUserId();
  const { data, error } = await getSupabaseClient().from('collection_items').update({ is_favorite: value }).eq('id', id).eq('user_id', userId).select('id').single();
  if (error) throw error;
  return data;
}
export async function deleteCollectionItem(id: string) {
  const userId = await authenticatedUserId();
  const { data, error } = await getSupabaseClient().from('collection_items').delete().eq('id', id).eq('user_id', userId).select('id,photo_url').single();
  if (error) throw error;
  if (data.photo_url) {
    try { await removeCopyPhoto(userId, id, data.photo_url); }
    catch { console.warn('Cópia removida; limpeza da foto no Storage pendente.'); }
  }
  return { id: data.id };
}
