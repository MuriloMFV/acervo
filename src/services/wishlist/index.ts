import {getSupabaseClient} from '../supabase/client';
import {authenticatedUserId} from '../collection';
import {isCollectionItemId} from '../collection/mappers';
import type {WishlistItemRow} from '../supabase/types';
import type {MovieSearchCandidate} from '../../types/movieSearch';
import type {WishlistFormValues} from './logic';
import {createWish,editWish,removeWish,type WishlistStore} from './operations';
const store:WishlistStore={
  userId:authenticatedUserId,
  insert:async payload=>{const {data,error}=await getSupabaseClient().from('wishlist_items').insert(payload).select('*').single();if(error)throw error;return data;},
  update:async(id,userId,updatedAt,payload)=>{const {data,error}=await getSupabaseClient().from('wishlist_items').update(payload).eq('id',id).eq('user_id',userId).eq('updated_at',updatedAt).select('*').maybeSingle();if(error)throw error;return data;},
  remove:async(id,userId,updatedAt)=>{const {data,error}=await getSupabaseClient().from('wishlist_items').delete().eq('id',id).eq('user_id',userId).eq('updated_at',updatedAt).select('id');if(error)throw error;return data.length===1;},
};
export const createWishlistItem=(movie:MovieSearchCandidate,form:WishlistFormValues,userId:string,confirmed=false)=>createWish(store,movie,form,userId,confirmed);
export const updateWishlistItem=(item:WishlistItemRow,form:WishlistFormValues,userId:string)=>editWish(store,item,form,userId);
export const removeWishlistItem=(item:WishlistItemRow,userId:string)=>removeWish(store,item,userId);
export async function listWishlistItems(signal?:AbortSignal):Promise<WishlistItemRow[]> {
  const userId=await authenticatedUserId();
  let query=getSupabaseClient().from('wishlist_items').select('*').eq('user_id',userId).order('created_at',{ascending:false}).order('id',{ascending:false});
  if(signal)query=query.abortSignal(signal);
  const items:WishlistItemRow[]=[];
  for(let offset=0;;offset+=500){const {data,error}=await query.range(offset,offset+499);if(error)throw error;items.push(...data);if(data.length<500)return items;}
}
export async function getWishlistItem(id:string,signal?:AbortSignal):Promise<WishlistItemRow|null> {
  if(!isCollectionItemId(id))return null;const userId=await authenticatedUserId();
  let query=getSupabaseClient().from('wishlist_items').select('*').eq('id',id).eq('user_id',userId);if(signal)query=query.abortSignal(signal);
  const {data,error}=await query.maybeSingle();if(error)throw error;return data;
}
