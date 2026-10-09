export const COPY_PHOTOS_BUCKET = 'copy-photos';
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const SIGNED_PHOTO_SECONDS = 900;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type PhotoMime = 'image/jpeg' | 'image/png' | 'image/webp';
const extensions: Record<PhotoMime, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
export function validatePhotoBytes(bytes: Uint8Array, mime: string): PhotoMime {
  if (!bytes.length || bytes.length > MAX_PHOTO_BYTES) throw new Error('A foto deve ter até 5 MB.');
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = [137,80,78,71,13,10,26,10].every((v,i) => bytes[i] === v);
  const webp = bytes.length >= 12 && [82,73,70,70].every((v,i) => bytes[i] === v) && [87,69,66,80].every((v,i) => bytes[i + 8] === v);
  if (mime === 'image/jpeg' && jpeg || mime === 'image/png' && png || mime === 'image/webp' && webp) return mime as PhotoMime;
  throw new Error('Escolha uma imagem JPEG, PNG ou WebP válida.');
}
export function copyPhotoPath(userId: string, itemId: string, fileId: string, mime: PhotoMime): string {
  if (![userId,itemId,fileId].every(value => uuid.test(value)) || !(mime in extensions)) throw new Error('Foto inválida.');
  return `${userId.toLowerCase()}/${itemId.toLowerCase()}/photo-${fileId.toLowerCase()}.${extensions[mime]}`;
}
export function isOwnCopyPhoto(path: string, userId: string, itemId: string): boolean {
  if (!uuid.test(userId) || !uuid.test(itemId)) return false;
  return new RegExp(`^${userId.toLowerCase()}/${itemId.toLowerCase()}/photo-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(jpg|png|webp)$`).test(path);
}
export interface PreparedCopyPhoto { uri: string; mime: PhotoMime }
export type PhotoDraft = { action: 'keep' } | { action: 'remove' } | { action: 'replace'; photo: PreparedCopyPhoto };
