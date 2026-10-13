import type { WishlistItemRow } from '../supabase/types';
import type { MovieSearchCandidate } from '../../types/movieSearch';
import {parseWishlistForm,wishlistMovieSnapshot,type WishlistEdit,type WishlistFormValues} from './logic.ts';
export class WishlistDuplicateError extends Error {constructor(){super('Este filme já está na sua lista de desejos.');this.name='WishlistDuplicateError';}}
export class WishlistChangedError extends Error {constructor(){super('O item foi alterado ou removido. Recarregue para continuar.');this.name='WishlistChangedError';}}
export type WishlistCreate = WishlistEdit & ReturnType<typeof wishlistMovieSnapshot> & {user_id:string;duplicate_confirmed:boolean};
export interface WishlistStore {
  userId:()=>Promise<string>;
  insert:(payload:WishlistCreate)=>Promise<WishlistItemRow>;
  update:(id:string,userId:string,updatedAt:string,payload:WishlistEdit)=>Promise<WishlistItemRow|null>;
  remove:(id:string,userId:string,updatedAt:string)=>Promise<boolean>;
}
async function owner(store:WishlistStore,expectedUserId:string) {
  if(await store.userId()!==expectedUserId)throw new Error('Sessão alterada.');
}
export async function createWish(store:WishlistStore,movie:MovieSearchCandidate,form:WishlistFormValues,userId:string,confirmed=false) {
  const payload={...wishlistMovieSnapshot(movie),...parseWishlistForm(form),user_id:userId,duplicate_confirmed:confirmed};
  await owner(store,userId);
  try{return await store.insert(payload);}catch(error){if(error&&typeof error==='object'&&'code' in error&&error.code==='23505')throw new WishlistDuplicateError();throw error;}
}
export async function editWish(store:WishlistStore,item:WishlistItemRow,form:WishlistFormValues,userId:string) {
  const payload=parseWishlistForm(form);if(item.user_id!==userId)throw new Error('Item indisponível.');await owner(store,userId);
  const updated=await store.update(item.id,userId,item.updated_at,payload);if(!updated)throw new WishlistChangedError();return updated;
}
export async function removeWish(store:WishlistStore,item:WishlistItemRow,userId:string) {
  if(item.user_id!==userId)throw new Error('Item indisponível.');await owner(store,userId);
  if(!await store.remove(item.id,userId,item.updated_at))throw new WishlistChangedError();
}
