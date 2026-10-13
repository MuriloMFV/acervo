import {useCallback,useMemo,useState} from 'react';
import {useRouter} from 'expo-router';
import {ActivityIndicator,FlatList,Keyboard,KeyboardAvoidingView,Modal,Platform,ScrollView,StyleSheet,View,type ListRenderItem} from 'react-native';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import Plus from 'lucide-react-native/icons/plus';
import {AppText,IconButton,Screen} from '../../src/components/ui';
import {FormField} from '../../src/components/ui/FormField';
import {ActionButton} from '../../src/components/ui/ActionButton';
import {WishlistRow} from '../../src/components/wishlist/WishlistRow';
import {WishlistChoices} from '../../src/components/wishlist/WishlistFields';
import {useWishlist} from '../../src/hooks/useWishlist';
import {defaultWishlistFilters,desiredFormatLabels,filterWishlist,priorityLabels,statusLabels,wishlistSortLabels,type WishlistSort} from '../../src/services/wishlist/logic';
import type {WishlistItemRow} from '../../src/services/supabase/types';
import {colors,controls,radius,spacing} from '../../src/theme';
export default function WishlistScreen() {
  const router=useRouter();const wishlist=useWishlist();
  const [search,setSearch]=useState('');const [filters,setFilters]=useState(defaultWishlistFilters);const [sort,setSort]=useState<WishlistSort>('PRIORITY');
  const [filtersOpen,setFiltersOpen]=useState(false);const [sortOpen,setSortOpen]=useState(false);
  const items=useMemo(()=>filterWishlist(wishlist.data??[],search,filters,sort),[wishlist.data,search,filters,sort]);
  const open=useCallback((id:string)=>router.push({pathname:'/wishlist/[id]',params:{id}}),[router]);
  const renderItem=useCallback<ListRenderItem<WishlistItemRow>>(({item})=><WishlistRow item={item} onPress={open} />,[open]);
  const back=()=>router.canGoBack()?router.back():router.replace('/profile');
  const active=!!(filters.priority||filters.format||filters.status);
  return <Screen>
    <View style={styles.header}><IconButton accessibilityLabel="Voltar ao Perfil" onPress={back}><ArrowLeft size={controls.iconSize} color={colors.textSecondary} /></IconButton><AppText variant="heading" style={styles.flex}>Lista de desejos</AppText><IconButton accessibilityLabel="Adicionar à lista de desejos" onPress={()=>router.navigate('/wishlist/search')}><Plus size={controls.iconSize} color={colors.accent} /></IconButton></View>
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS==='ios'?'padding':'height'}>
    <FlatList data={items} keyExtractor={item=>item.id} renderItem={renderItem} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" initialNumToRender={10} windowSize={7} contentContainerStyle={styles.list}
      ListHeaderComponent={<View style={styles.controls}>
        <FormField label="Buscar título" placeholder="Buscar na lista de desejos…" value={search} onChangeText={setSearch} autoCorrect={false} />
        <View style={styles.buttons}><ActionButton secondary label={active?'Filtros ativos':'Filtros'} onPress={()=>{Keyboard.dismiss();setFiltersOpen(value=>!value);}} /><ActionButton secondary label={wishlistSortLabels[sort]} onPress={()=>{Keyboard.dismiss();setSortOpen(true);}} /></View>
        {filtersOpen&&<View style={styles.controls}>
          <WishlistChoices label="Prioridade" all labels={priorityLabels} value={filters.priority} onChange={priority=>setFilters(current=>({...current,priority}))} />
          <WishlistChoices label="Formato" all labels={desiredFormatLabels} value={filters.format} onChange={format=>setFilters(current=>({...current,format}))} />
          <WishlistChoices label="Status" all labels={statusLabels} value={filters.status} onChange={status=>setFilters(current=>({...current,status}))} />
          {active&&<ActionButton secondary label="Limpar filtros" onPress={()=>setFilters(defaultWishlistFilters())} />}
        </View>}
        {wishlist.isError&&<View style={styles.controls}><AppText accessibilityRole="alert" color="textMuted">Não foi possível carregar a lista de desejos</AppText><ActionButton secondary label="Tentar novamente" onPress={()=>{void wishlist.refetch();}} /></View>}
      </View>}
      ListEmptyComponent={wishlist.isPending?<ActivityIndicator accessibilityLabel="Carregando lista de desejos" color={colors.accent} style={styles.empty} />:!wishlist.isError?<AppText color="textMuted" style={styles.empty}>{wishlist.data?.length?'Nenhum item encontrado':'Sua lista de desejos está vazia'}</AppText>:null}
    />
    </KeyboardAvoidingView>
    <Modal visible={sortOpen} transparent animationType="fade" onRequestClose={()=>setSortOpen(false)}>
      <Screen style={styles.modal}><View accessibilityViewIsModal style={styles.menu}><ScrollView contentContainerStyle={styles.menuContent}><AppText variant="heading">Ordenar por</AppText>{(Object.keys(wishlistSortLabels) as WishlistSort[]).map(value=><ActionButton key={value} secondary={sort!==value} label={wishlistSortLabels[value]} onPress={()=>{setSort(value);setSortOpen(false);}} />)}<ActionButton secondary label="Cancelar" onPress={()=>setSortOpen(false)} /></ScrollView></View></Screen>
    </Modal>
  </Screen>;
}
const styles=StyleSheet.create({flex:{flex:1},header:{flexDirection:'row',alignItems:'center',gap:spacing.sm,paddingVertical:spacing.sm},list:{paddingBottom:spacing.xl},controls:{gap:spacing.md,paddingBottom:spacing.sm},buttons:{flexDirection:'row',flexWrap:'wrap',gap:spacing.sm},empty:{textAlign:'center',paddingVertical:spacing.xl},modal:{flex:1,justifyContent:'center',backgroundColor:colors.background+'EE'},menu:{maxHeight:'80%',borderRadius:radius.lg,backgroundColor:colors.surface,overflow:'hidden'},menuContent:{padding:spacing.md,gap:spacing.sm}});
