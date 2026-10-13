import {Alert} from 'react-native';
import {useRouter} from 'expo-router';
import type {WishlistItemRow,WishlistStatus} from '../services/supabase/types';
import {offerAcquired,wishlistCollectionRoute} from '../services/wishlist/logic';
export function useWishlistAcquisition() {
  const router=useRouter();
  return (item:WishlistItemRow,previous:WishlistStatus|null)=>{
    if(!offerAcquired(previous,item.status))return;
    Alert.alert('Adicionar este título ao Acervo?',item.title,[
      {text:'Agora não',style:'cancel'},
      {text:'Adicionar ao Acervo',onPress:()=>router.navigate(wishlistCollectionRoute(item))},
    ]);
  };
}
