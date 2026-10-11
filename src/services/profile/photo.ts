import { randomUUID } from 'expo-crypto';
import { getSupabaseClient } from '../supabase/client';
import { readPhotoFile } from '../photos/file';
import { SIGNED_PHOTO_SECONDS, validatePhotoBytes, type PhotoDraft } from '../photos/validation';
import { isOwnProfilePhoto, profilePhotoPath, PROFILE_PHOTOS_BUCKET } from './photoValidation';
import { saveProfilePhotoChange } from './photoSaving';

export async function saveProfilePhoto(userId: string, previous: string | null, draft: Exclude<PhotoDraft, { action: 'keep' }>) {
  const client = getSupabaseClient();
  const storage = client.storage.from(PROFILE_PHOTOS_BUCKET);
  const currentUserId = async () => {
    const { data, error } = await client.auth.getSession();
    if (error || !data.session || data.session.user.is_anonymous) throw new Error('Entre para continuar.');
    return data.session.user.id;
  };
  return saveProfilePhotoChange(userId, previous, draft, {
    currentUserId,
    upload: async photo => {
      const buffer = await readPhotoFile(photo.uri);
      const mime = validatePhotoBytes(new Uint8Array(buffer), photo.mime);
      const path = profilePhotoPath(userId, randomUUID(), mime);
      if (await currentUserId() !== userId) throw new Error('Sessão alterada. Entre novamente.');
      const { error } = await storage.upload(path, buffer, { contentType: mime, upsert: false });
      if (error) throw new Error('Não foi possível enviar a foto. Tente novamente.');
      return path;
    },
    persist: async (path, expected) => {
      let query = client.from('profiles').update({ avatar_url: path }).eq('id', userId);
      query = expected === null ? query.is('avatar_url', null) : query.eq('avatar_url', expected);
      const { data, error } = await query.select('*').single();
      if (error || !data) throw new Error('Não foi possível salvar a foto. Atualize o perfil e tente novamente.');
      return data;
    },
    remove: async path => {
      const { error } = await storage.remove([path]);
      if (error) throw new Error('Não foi possível limpar a foto anterior.');
    },
  });
}

export async function signedProfilePhoto(userId: string, path: string): Promise<string> {
  if (!isOwnProfilePhoto(path, userId)) throw new Error('Foto de perfil inválida.');
  const { data, error } = await getSupabaseClient().storage.from(PROFILE_PHOTOS_BUCKET).createSignedUrl(path, SIGNED_PHOTO_SECONDS);
  if (error || !data?.signedUrl) throw new Error('Não foi possível carregar a foto de perfil.');
  return data.signedUrl;
}
