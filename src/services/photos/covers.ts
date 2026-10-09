import type { CollectionRecord } from '../collection/types.ts';
import { isOwnCopyPhoto } from './validation.ts';
export interface PhotoCoverRequest { itemId: string; path: string }
export function photoCoverRequests(items: readonly CollectionRecord[], userId: string): PhotoCoverRequest[] {
  return items.flatMap(item => item.use_photo_as_cover && item.photo_url && item.user_id === userId && isOwnCopyPhoto(item.photo_url, userId, item.id)
    ? [{ itemId: item.id, path: item.photo_url }] : []);
}
export function withPhotoCover(item: CollectionRecord, urls: Readonly<Record<string, string>>): CollectionRecord {
  return { ...item, photo_cover_url: item.use_photo_as_cover && item.photo_url ? urls[item.photo_url] ?? null : null };
}
