import { randomUUID } from 'expo-crypto';
import { getSupabaseClient } from '../supabase/client';
import { copyPhotoPath, COPY_PHOTOS_BUCKET, isOwnCopyPhoto, SIGNED_PHOTO_SECONDS, validatePhotoBytes, type PreparedCopyPhoto } from './validation';
import { readPhotoFile } from './file';

export async function uploadCopyPhoto(userId: string, itemId: string, photo: PreparedCopyPhoto): Promise<string> {
  const buffer = await readPhotoFile(photo.uri);
  const mime = validatePhotoBytes(new Uint8Array(buffer), photo.mime);
  const path = copyPhotoPath(userId, itemId, randomUUID(), mime);
  const { error } = await getSupabaseClient().storage.from(COPY_PHOTOS_BUCKET).upload(path, buffer, { contentType: mime, upsert: false });
  if (error) throw new Error('Não foi possível enviar a foto.');
  return path;
}
export async function removeCopyPhoto(userId: string, itemId: string, path: string): Promise<void> {
  if (!isOwnCopyPhoto(path, userId, itemId)) throw new Error('Foto inválida.');
  const { error } = await getSupabaseClient().storage.from(COPY_PHOTOS_BUCKET).remove([path]);
  if (error) throw new Error('Não foi possível limpar a foto anterior.');
}
export async function signedCopyPhoto(userId: string, itemId: string, path: string): Promise<string> {
  if (!isOwnCopyPhoto(path, userId, itemId)) throw new Error('Foto inválida.');
  const { data, error } = await getSupabaseClient().storage.from(COPY_PHOTOS_BUCKET).createSignedUrl(path, SIGNED_PHOTO_SECONDS);
  if (error || !data?.signedUrl) throw new Error('Não foi possível carregar a foto.');
  return data.signedUrl;
}

// Batch signing keeps large collections from making one HTTP call per card.
export async function signedCopyPhotoCovers(userId: string, requests: readonly import('./covers').PhotoCoverRequest[]): Promise<Record<string, string>> {
  if (requests.some(({ itemId, path }) => !isOwnCopyPhoto(path, userId, itemId))) throw new Error('Foto inválida.');
  const urls: Record<string, string> = {};
  for (let offset = 0; offset < requests.length; offset += 100) {
    const paths = requests.slice(offset, offset + 100).map(request => request.path);
    const { data, error } = await getSupabaseClient().storage.from(COPY_PHOTOS_BUCKET).createSignedUrls(paths, SIGNED_PHOTO_SECONDS);
    if (error) throw new Error('Não foi possível carregar as fotos.');
    for (const row of data ?? []) if (!row.error && row.path && row.signedUrl) urls[row.path] = row.signedUrl;
  }
  return urls;
}
