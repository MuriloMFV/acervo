import { randomUUID } from 'expo-crypto';
import { getSupabaseClient } from '../supabase/client';
import { readPhotoFile } from '../photos/file';
import type { PreparedCopyPhoto } from '../photos/validation';
import { EDITION_COVERS_BUCKET } from './storage';
import { saveEditionCoverPhoto } from './photoUpload';

export async function uploadEditionCoverPhoto(userId: string, photo: PreparedCopyPhoto, side: 'front' | 'back' = 'back'): Promise<string> {
  const client = getSupabaseClient();
  const storage = client.storage.from(EDITION_COVERS_BUCKET);
  return saveEditionCoverPhoto(userId, photo, {
    currentUserId: async () => {
      const { data, error } = await client.auth.getSession();
      if (error || !data.session || data.session.user.is_anonymous) throw new Error('Entre para continuar.');
      return data.session.user.id;
    },
    readFile: readPhotoFile,
    createId: randomUUID,
    upload: async (path, buffer, mime) => {
      const { error } = await storage.upload(path, buffer, { contentType: mime, upsert: false, cacheControl: '31536000' });
      if (error) throw new Error(`Não foi possível enviar a ${side === 'back' ? 'contracapa' : 'capa'}. Tente novamente.`);
    },
    publicUrl: path => storage.getPublicUrl(path).data.publicUrl,
    bucketUrl: storage.getPublicUrl('').data.publicUrl,
  });
}
