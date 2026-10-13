import {useCallback,useState} from 'react';
import {useRouter} from 'expo-router';
import {FlatList,Keyboard,KeyboardAvoidingView,Platform,StyleSheet,View,type ListRenderItem} from 'react-native';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import {AppText,IconButton,Screen} from '../../src/components/ui';
import {MovieSearchField} from '../../src/components/add/MovieSearchField';
import {MovieSearchResult} from '../../src/components/add/MovieSearchResult';
import {ActionButton} from '../../src/components/ui/ActionButton';
import {useMovieSearch} from '../../src/hooks/useMovieSearch';
import type {MovieSearchCandidate} from '../../src/types/movieSearch';
import {colors,controls,spacing} from '../../src/theme';
export default function WishlistSearchScreen() {
  const router=useRouter();const [search,setSearch]=useState('');const {results,status,retry}=useMovieSearch(search);
  const choose=useCallback((id:string)=>{Keyboard.dismiss();router.navigate({pathname:'/wishlist/add',params:{id}});},[router]);
  const render=useCallback<ListRenderItem<MovieSearchCandidate>>(({item})=><MovieSearchResult movie={item} onPress={choose} />,[choose]);
  const back=()=>router.canGoBack()?router.back():router.replace('/wishlist');
  return <Screen><View style={styles.header}><IconButton accessibilityLabel="Voltar" onPress={back}><ArrowLeft size={controls.iconSize} color={colors.textSecondary} /></IconButton><AppText variant="heading">Buscar filme</AppText></View>
    <KeyboardAvoidingView style={styles.content} behavior={Platform.OS==='ios'?'padding':'height'}>
    <MovieSearchField value={search} onChangeText={setSearch} />
    <FlatList data={results} keyExtractor={movie=>movie.id} renderItem={render} initialNumToRender={8} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.results}
      ListEmptyComponent={status==='loading'?<AppText color="textMuted">Buscando…</AppText>:status==='error'?<View style={styles.results}><AppText color="textMuted">Não foi possível buscar agora</AppText><ActionButton secondary label="Tentar novamente" onPress={retry} /></View>:status==='success'?<AppText color="textMuted">Nenhum filme encontrado</AppText>:null}
    />
    </KeyboardAvoidingView>
  </Screen>;
}
const styles=StyleSheet.create({content:{flex:1},header:{flexDirection:'row',alignItems:'center',gap:spacing.sm,paddingVertical:spacing.md},results:{gap:spacing.sm,paddingVertical:spacing.md}});
