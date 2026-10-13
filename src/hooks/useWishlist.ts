import {useQuery} from '@tanstack/react-query';
import {useSession} from '../contexts/SessionContext';
import {getWishlistItem,listWishlistItems} from '../services/wishlist';
export const wishlistKeys={list:(userId:string)=>['wishlist',userId] as const,item:(userId:string,id:string)=>['wishlist',userId,id] as const};
export function useWishlist(){const {session}=useSession();return useQuery({queryKey:wishlistKeys.list(session?.user.id??''),queryFn:({signal})=>listWishlistItems(signal),enabled:!!session});}
export function useWishlistItem(id:string){const {session}=useSession();return useQuery({queryKey:wishlistKeys.item(session?.user.id??'',id),queryFn:({signal})=>getWishlistItem(id,signal),enabled:!!session&&!!id});}
