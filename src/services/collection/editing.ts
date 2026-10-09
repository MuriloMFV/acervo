import { getSupabaseClient } from '../supabase/client';
import { authenticatedUserId } from './index';
import type { CopyUpdate } from './types';
import type { EditionEdit } from './editionEditing';
import type { PhotoDraft } from '../photos/validation';
import { uploadCopyPhoto, removeCopyPhoto } from '../photos';
import { saveCopyPhoto } from '../photos/lifecycle';

export async function saveCopyChanges(itemId: string, payload: CopyUpdate, previousPhoto: string | null, draft: PhotoDraft) {
  const userId = await authenticatedUserId();
  return saveCopyPhoto(previousPhoto, draft, {
    upload: () => {
      if (draft.action !== 'replace') throw new Error('Foto inválida.');
      return uploadCopyPhoto(userId, itemId, draft.photo);
    },
    persist: async (photoPath) => {
      if (await authenticatedUserId() !== userId) throw new Error('Sessão alterada.');
      let query = getSupabaseClient().from('collection_items').update({ ...payload, ...(photoPath === undefined ? {} : { photo_url: photoPath }), ...(photoPath === null ? { use_photo_as_cover: false } : {}) }).eq('id', itemId).eq('user_id', userId);
      // A stale form must not overwrite a photo chosen on another device.
      if (photoPath !== undefined || payload.use_photo_as_cover !== undefined) query = previousPhoto ? query.eq('photo_url', previousPhoto) : query.is('photo_url', null);
      const { data, error } = await query.select('id').single();
      if (error) throw new Error('Não foi possível salvar. Reabra a cópia para conferir os dados.');
      return data;
    },
    remove: path => removeCopyPhoto(userId, itemId, path),
  });
}
export async function editCollectionEdition(itemId: string, expectedEditionId: string, fields: EditionEdit) {
  await authenticatedUserId();
  const client = getSupabaseClient();
  if (fields.custom_cover_url && !fields.custom_cover_url.startsWith(client.storage.from('edition-covers').getPublicUrl('').data.publicUrl)) throw new Error('Escolha uma capa salva pelo Acervo.');
  const { data, error } = await client.rpc('edit_collection_edition', { p_item_id: itemId, p_expected_edition_id: expectedEditionId, p_fields: fields });
  if (error) throw new Error(error.code === '40001' ? 'A edição mudou. Reabra os detalhes antes de salvar.' : 'Não foi possível salvar a edição.');
  return data;
}
