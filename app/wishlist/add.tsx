import {useRef,useState} from 'react';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {ActivityIndicator,Alert,Image,KeyboardAvoidingView,Platform,ScrollView,StyleSheet,View} from 'react-native';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import {AppText,IconButton,Screen} from '../../src/components/ui';
import {ActionButton} from '../../src/components/ui/ActionButton';
import {WishlistFields} from '../../src/components/wishlist/WishlistFields';
import {useSession} from '../../src/contexts/SessionContext';
import {useWishlistAcquisition} from '../../src/hooks/useWishlistAcquisition';
import {wishlistKeys} from '../../src/hooks/useWishlist';
import {createWishlistItem} from '../../src/services/wishlist';
import {emptyWishlistForm,parseWishlistForm} from '../../src/services/wishlist/logic';
import {WishlistDuplicateError} from '../../src/services/wishlist/operations';
import {withSavedWish} from '../../src/services/wishlist/cache';
import type {WishlistItemRow} from '../../src/services/supabase/types';
import {getMovieDetails} from '../../src/services/tmdb';
import {queryKeys} from '../../src/lib/queryClient';
import {colors,controls,radius,spacing} from '../../src/theme';

function confirmDuplicate():Promise<boolean> {
  return new Promise(resolve=>Alert.alert('Filme já está na lista','Quer adicionar este filme novamente?',[
    {text:'Cancelar',style:'cancel',onPress:()=>resolve(false)},
    {text:'Adicionar mesmo assim',onPress:()=>resolve(true)},
  ],{cancelable:true,onDismiss:()=>resolve(false)}));
}
export default function AddWishlistScreen() {
  const {id}=useLocalSearchParams<{id?:string|string[]}>();const router=useRouter();const cache=useQueryClient();const {session}=useSession();const offer=useWishlistAcquisition();
  const movieId=typeof id==='string'?id:'';const valid=/^[1-9]\d*$/.test(movieId)&&Number.isSafeInteger(Number(movieId));
  const movie=useQuery({queryKey:queryKeys.movie(movieId),queryFn:({signal})=>getMovieDetails(movieId,signal),enabled:valid,staleTime:300_000});
  const [form,setForm]=useState(emptyWishlistForm);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const lock=useRef(false);
  const submit=async()=>{
    if(lock.current||!movie.data||!session)return;
    try{parseWishlistForm(form);}catch(cause){setError(cause instanceof Error?cause.message:'Confira os campos.');return;}
    lock.current=true;setBusy(true);setError('');
    try {
      let saved;
      try{saved=await createWishlistItem(movie.data,form,session.user.id);}
      catch(cause){if(!(cause instanceof WishlistDuplicateError))throw cause;if(!await confirmDuplicate())return;saved=await createWishlistItem(movie.data,form,session.user.id,true);}
      cache.setQueryData(wishlistKeys.item(session.user.id,saved.id),saved);
      cache.setQueryData<WishlistItemRow[]>(wishlistKeys.list(session.user.id),current=>withSavedWish(current,saved));
      await cache.invalidateQueries({queryKey:wishlistKeys.list(session.user.id),exact:true});
      router.dismissTo('/wishlist');
      offer(saved,null);
    }catch{setError('Não foi possível salvar o desejo. Confira a conexão e tente novamente.');}
    finally{lock.current=false;setBusy(false);}
  };
  const back=()=>router.canGoBack()?router.back():router.replace('/wishlist/search');
  return <Screen><View style={styles.header}><IconButton accessibilityLabel="Voltar" onPress={back} disabled={busy}><ArrowLeft size={controls.iconSize} color={colors.textSecondary} /></IconButton><AppText variant="heading" style={styles.flex}>Adicionar desejo</AppText></View>
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS==='ios'?'padding':'height'}><ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.content}>
      {valid&&movie.isPending&&<ActivityIndicator accessibilityLabel="Carregando filme" color={colors.accent} />}
      {valid&&movie.isError&&<><AppText color="textMuted">Não foi possível carregar o filme</AppText><ActionButton secondary label="Tentar novamente" onPress={()=>{void movie.refetch();}} /></>}
      {!valid&&<AppText color="textMuted">Filme não encontrado</AppText>}
      {movie.data&&<>
        {movie.data.posterUrl&&<Image accessibilityLabel={movie.data.title} source={{uri:movie.data.posterUrl}} style={styles.poster} resizeMode="contain" />}
        <AppText variant="heading">{movie.data.title}</AppText><AppText variant="caption" color="textMuted">{movie.data.year??'—'}</AppText>
        <WishlistFields value={form} onChange={value=>{setForm(value);setError('');}} disabled={busy} />
        {!!error&&<AppText accessibilityRole="alert" color="danger">{error}</AppText>}
        <ActionButton label="Salvar na lista de desejos" busy={busy} onPress={()=>{void submit();}} />
      </>}
    </ScrollView></KeyboardAvoidingView>
  </Screen>;
}
const styles=StyleSheet.create({flex:{flex:1},header:{flexDirection:'row',alignItems:'center',gap:spacing.sm,paddingVertical:spacing.sm},content:{gap:spacing.md,paddingBottom:spacing.xl},poster:{width:spacing.xl*4,aspectRatio:2/3,borderRadius:radius.md,alignSelf:'center'}});
