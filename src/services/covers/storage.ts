// Covers selected by the existing picker are immutable objects in this bucket.
import type { PhotoMime } from '../photos/validation';
const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
export const EDITION_COVERS_BUCKET = 'edition-covers';

export function editionCoverPhotoPath(userId: string, fileId: string, mime: PhotoMime): string {
  const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
  if (![userId, fileId].every(value => new RegExp(`^${uuid}$`, 'i').test(value)) || !(mime in extensions)) throw new Error('Foto inválida.');
  return `${userId.toLowerCase()}/${fileId.toLowerCase()}.${extensions[mime]}`;
}

export function storedEditionCover(value: string | null | undefined, publicBucketUrl: string): string | null {
  const text = value?.trim();
  if (!text) return null;
  try {
    const root = new URL(publicBucketUrl);
    const url = new URL(text);
    const prefix = root.pathname.replace(/\/?$/, '/');
    if (url.origin !== root.origin || url.username || url.password || url.search || url.hash
      || !url.pathname.startsWith(prefix)
      || !new RegExp(`^${uuid}/${uuid}\\.(jpg|png|webp)$`, 'i').test(url.pathname.slice(prefix.length))) throw new Error();
    return url.href;
  } catch { throw new Error('Escolha uma imagem salva pelo Acervo.'); }
}
