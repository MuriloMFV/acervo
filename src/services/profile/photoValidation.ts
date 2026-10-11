import type { PhotoMime } from '../photos/validation.ts';

export const PROFILE_PHOTOS_BUCKET = 'profile-photos';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const extensions: Record<PhotoMime, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

export function profilePhotoPath(userId: string, fileId: string, mime: PhotoMime): string {
  if (!uuid.test(userId) || !uuid.test(fileId) || !(mime in extensions)) throw new Error('Foto de perfil inválida.');
  return `${userId.toLowerCase()}/avatar-${fileId.toLowerCase()}.${extensions[mime]}`;
}

export function isOwnProfilePhoto(path: string, userId: string): boolean {
  return uuid.test(userId) && new RegExp(`^${userId.toLowerCase()}/avatar-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(jpg|png|webp)$`).test(path);
}
