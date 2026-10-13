import type {WishlistItemRow} from '../supabase/types';
// Never initialize a full-list cache with a single row when it has not loaded yet.
export function withSavedWish(items:readonly WishlistItemRow[]|undefined,saved:WishlistItemRow):WishlistItemRow[]|undefined {
  return items?[saved,...items.filter(item=>item.id!==saved.id)]:undefined;
}
export function withoutRemovedWish(items:readonly WishlistItemRow[]|undefined,id:string):WishlistItemRow[]|undefined {
  return items?.filter(item=>item.id!==id);
}
