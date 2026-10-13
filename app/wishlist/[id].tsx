import {useRef,useState} from 'react';
import {useLocalSearchParams,useRouter} from 'expo-router';
import {useQueryClient} from '@tanstack/react-query';
import {ActivityIndicator,Alert,Image,KeyboardAvoidingView,Platform,ScrollView,StyleSheet,View} from 'react-native';
import * as Linking from 'expo-linking';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import {AppText,IconButton,Screen} from '../../src/components/ui';
import {ActionButton} from '../../src/components/ui/ActionButton';
import {WishlistFields} from '../../src/components/wishlist/WishlistFields';
import {useSession} from '../../src/contexts/SessionContext';
import {useWishlistItem,wishlistKeys} from '../../src/hooks/useWishlist';
import {useWishlistAcquisition} from '../../src/hooks/useWishlistAcquisition';
import {removeWishlistItem,updateWishlistItem} from '../../src/services/wishlist';
import {desiredFormatLabels,emptyWishlistForm,parseWishlistForm,priorityLabels,statusLabels,validatedListingUrl,wishlistForm} from '../../src/services/wishlist/logic';
import {WishlistChangedError} from '../../src/services/wishlist/operations';
import {withSavedWish,withoutRemovedWish} from '../../src/services/wishlist/cache';
import type {WishlistItemRow} from '../../src/services/supabase/types';
import {formatPurchasePrice} from '../../src/utils/collectionDetails';
import {colors,controls,radius,spacing} from '../../src/theme';

export default function WishlistDetailsScreen() {
  const {id}=useLocalSearchParams<{id?:string|string[]}>();const itemId=typeof id==='string'?id:'';
  const item=useWishlistItem(itemId);const router=useRouter();const cache=useQueryClient();const {session}=useSession();const offer=useWishlistAcquisition();
  const [original,setOriginal]=useState<WishlistItemRow|null>(null);const [form,setForm]=useState(emptyWishlistForm);
  const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [changed,setChanged]=useState(false);const lock=useRef(false);
  const back=()=>router.canGoBack()?router.back():router.replace('/wishlist');
  const failure=(cause:unknown,action='salvar a alteração')=>{setChanged(cause instanceof WishlistChangedError);setError(cause instanceof WishlistChangedError?cause.message:`Não foi possível ${action}. Confira a conexão e tente novamente.`);};
  const save=async()=>{
    if(lock.current||!original||!session)return;
    try{parseWishlistForm(form);}catch(cause){setError(cause instanceof Error?cause.message:'Confira os campos.');return;}
    lock.current=true;setBusy(true);setError('');setChanged(false);
    try{
      const saved=await updateWishlistItem(original,form,session.user.id);
      cache.setQueryData(wishlistKeys.item(session.user.id,saved.id),saved);setOriginal(null);
      cache.setQueryData<WishlistItemRow[]>(wishlistKeys.list(session.user.id),current=>withSavedWish(current,saved));
      await cache.invalidateQueries({queryKey:wishlistKeys.list(session.user.id),exact:true});
      offer(saved,original.status);
    }catch(cause){failure(cause);}finally{lock.current=false;setBusy(false);}
  };
  const remove=async()=>{
    if(lock.current||!item.data||!session)return;lock.current=true;setBusy(true);setError('');setChanged(false);
    try{await removeWishlistItem(item.data,session.user.id);cache.setQueryData<WishlistItemRow[]>(wishlistKeys.list(session.user.id),current=>withoutRemovedWish(current,itemId));await cache.invalidateQueries({queryKey:wishlistKeys.list(session.user.id),exact:true});router.dismissTo('/wishlist');cache.removeQueries({queryKey:wishlistKeys.item(session.user.id,itemId),exact:true});}
    catch(cause){failure(cause,'remover o desejo');}finally{lock.current=false;setBusy(false);}
  };
  const confirmRemoval=()=>Alert.alert('Remover da lista de desejos?',item.data?.title,[{text:'Cancelar',style:'cancel'},{text:'Remover',style:'destructive',onPress:()=>{void remove();}}]);
  const openListing=async()=>{
    try{const url=validatedListingUrl(item.data?.listing_url??'');if(url)await Linking.openURL(url);}
    catch{Alert.alert('Abrir anúncio','Não foi possível abrir este link.');}
  };
  const reload=async()=>{
    const result=await item.refetch();
    if(result.isError)return;
    if(original&&result.data){setOriginal(result.data);setForm(wishlistForm(result.data));}
    else setOriginal(null);
    setError('');setChanged(false);
  };
  const data=item.data;
  return <Screen><View style={styles.header}><IconButton accessibilityLabel="Voltar à lista de desejos" onPress={back} disabled={busy}><ArrowLeft size={controls.iconSize} color={colors.textSecondary} /></IconButton><AppText variant="heading">{original?'Editar desejo':'Meu desejo'}</AppText></View>
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS==='ios'?'padding':'height'}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      {!!itemId&&item.isPending&&<ActivityIndicator accessibilityLabel="Carregando desejo" color={colors.accent} />}
      {item.isError&&<><AppText color="textMuted">Não foi possível carregar o desejo</AppText><ActionButton secondary label="Tentar novamente" onPress={()=>{void item.refetch();}} /></>}
      {!item.isPending&&!item.isError&&!data&&<AppText color="textMuted">Item não encontrado</AppText>}
      {!itemId&&<AppText color="textMuted">Item não encontrado</AppText>}
      {data&&<>
        {data.poster_url&&<Image source={{uri:data.poster_url}} accessibilityLabel={data.title} style={styles.poster} resizeMode="contain" />}
        <AppText variant="title">{data.title}</AppText><AppText variant="caption" color="textMuted">{data.release_year??'—'}</AppText>
        {original?<>
          <WishlistFields value={form} onChange={value=>{setForm(value);setError('');}} disabled={busy} />
          <ActionButton label="Salvar alterações" busy={busy} onPress={()=>{void save();}} />
          <ActionButton secondary label="Cancelar edição" disabled={busy} onPress={()=>{setOriginal(null);setError('');setChanged(false);}} />
        </>:<>
          {[
            ['Formato desejado',desiredFormatLabels[data.desired_format]],['Prioridade',priorityLabels[data.priority]],['Status',statusLabels[data.status]],
            ['Preço-alvo',formatPurchasePrice(data.target_price)],['Observações',data.notes??'—'],['Link do anúncio',data.listing_url??'—'],
          ].map(([label,value])=><View key={label} style={styles.field}><AppText variant="caption" color="textMuted">{label}</AppText><AppText>{value}</AppText></View>)}
          {!!data.listing_url&&<ActionButton secondary label="Abrir anúncio" onPress={()=>{void openListing();}} disabled={busy} />}
          <ActionButton label="Editar desejo" disabled={busy} onPress={()=>{setOriginal(data);setForm(wishlistForm(data));setError('');setChanged(false);}} />
          <ActionButton secondary label="Remover desejo" busy={busy} onPress={confirmRemoval} />
        </>}
        {!!error&&<AppText accessibilityRole="alert" color="danger">{error}</AppText>}
        {changed&&<ActionButton secondary label="Recarregar item" disabled={busy} onPress={()=>{void reload();}} />}
      </>}
    </ScrollView></KeyboardAvoidingView>
  </Screen>;
}
const styles=StyleSheet.create({flex:{flex:1},header:{flexDirection:'row',alignItems:'center',gap:spacing.sm,paddingVertical:spacing.sm},content:{gap:spacing.md,paddingBottom:spacing.xl},poster:{width:spacing.xl*4,aspectRatio:2/3,borderRadius:radius.md,alignSelf:'center'},field:{gap:spacing.xs,paddingVertical:spacing.xs}});
