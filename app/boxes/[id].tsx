import { memo, useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Image, StyleSheet, View } from 'react-native';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import Film from 'lucide-react-native/icons/film';
import { AppText, Badge, IconButton, Screen } from '../../src/components/ui';
import { ActionButton } from '../../src/components/ui/ActionButton';
import { CountryDisplay } from '../../src/components/ui/CountryDisplay';
import { useCollectionBox } from '../../src/hooks/useCollectionBoxes';
import { boxCover, includedBoxMovies } from '../../src/services/boxes/mappers';
import { mediaFormatLabels } from '../../src/components/movie/MediaFormatBadge';
import { conditionLabels, formatPurchaseDate, formatPurchasePrice } from '../../src/utils/collectionDetails';
import type { MovieRow } from '../../src/services/supabase/types';
import { colors, controls, radius, spacing } from '../../src/theme';

const IncludedMovie=memo(function IncludedMovie({movie}:{movie:MovieRow}) {
  return <View style={styles.movie}>
    <View style={styles.moviePoster}>{movie.poster_url?<Image source={{uri:movie.poster_url}} style={StyleSheet.absoluteFill} resizeMode="cover" resizeMethod="resize" />:<Film size={controls.iconSize} color={colors.textMuted} />}</View>
    <View style={styles.flex}><AppText variant="label" numberOfLines={2}>{movie.title}</AppText><AppText variant="caption" color="textMuted">{movie.release_year??'—'}</AppText></View>
  </View>;
});
export default function BoxDetailsScreen() {
  const {id}=useLocalSearchParams<{id?:string|string[]}>(); const router=useRouter();
  const box=useCollectionBox(typeof id==='string'?id:'');
  const movies=useMemo(()=>box.data?includedBoxMovies(box.data):[],[box.data]);
  const back=()=>router.canGoBack()?router.back():router.replace('/');
  const cover=box.data?boxCover(box.data):null;
  const set=box.data?.box_set;
  const fields=box.data&&set?[
    ['Formato',mediaFormatLabels[set.media_format]],['Distribuidora',set.publisher??'—'],['País',set.country??'—'],['Região',set.region??'—'],
    ['Discos',set.disc_count?.toString()??'—'],['Código de barras',set.barcode??'—'],
    ...(set.edition_name?[['Edição',set.edition_name]]:[]),
    ...(set.is_special_edition?[['Edição especial','Sim']]:[]),...(set.is_limited_edition?[['Edição limitada','Sim']]:[]),
    ['Condição',conditionLabels[box.data.condition]],['Preço pago',formatPurchasePrice(box.data.purchase_price)],['Aquisição',formatPurchaseDate(box.data.purchase_date)],
    ...(box.data.purchase_place?[['Local da compra',box.data.purchase_place]]:[]),...(box.data.notes?[['Notas',box.data.notes]]:[]),
  ]:[];
  return <Screen>
    <View style={styles.header}><IconButton accessibilityLabel="Voltar à coleção" onPress={back}><ArrowLeft size={controls.iconSize} color={colors.textSecondary} /></IconButton><AppText variant="heading">Meu box</AppText></View>
    {box.isPending&&!!id?<ActivityIndicator accessibilityLabel="Carregando box" color={colors.accent} />:box.isError?<View style={styles.error}><AppText color="textMuted">Não foi possível carregar o box</AppText><ActionButton secondary label="Tentar novamente" onPress={()=>{void box.refetch();}} /></View>:!box.data?<AppText color="textMuted">Item não encontrado</AppText>:<FlatList
      data={movies} keyExtractor={movie=>movie.id} renderItem={({item})=><IncludedMovie movie={item} />}
      initialNumToRender={8} contentContainerStyle={styles.content}
      ListHeaderComponent={<View style={styles.content}>
        <View style={styles.cover}>{cover?<Image accessibilityLabel={`Capa de ${set!.name}`} source={{uri:cover}} style={StyleSheet.absoluteFill} resizeMode="contain" />:<Film size={controls.iconSize} color={colors.textMuted} />}</View>
        <AppText variant="title">{set!.name}</AppText><View style={styles.header}><Badge label="BOX" tone="accent" /><AppText variant="caption" color="textSecondary">{movies.length} filmes</AppText></View>
        <View style={styles.fields}>{fields.map(([label,value])=><View style={styles.field} key={label}><AppText variant="caption" color="textMuted">{label}</AppText>{label==='País'?<CountryDisplay value={set!.country} />:<AppText variant="label">{value}</AppText>}</View>)}</View>
        <AppText variant="heading">Filmes incluídos</AppText>
      </View>}
    />}
  </Screen>;
}
const styles=StyleSheet.create({flex:{flex:1},header:{flexDirection:'row',alignItems:'center',gap:spacing.sm,paddingVertical:spacing.sm},content:{gap:spacing.md,paddingBottom:spacing.lg},cover:{width:spacing.xl*5,aspectRatio:2/3,alignSelf:'center',backgroundColor:colors.surface,borderRadius:radius.md,overflow:'hidden',alignItems:'center',justifyContent:'center'},fields:{flexDirection:'row',flexWrap:'wrap',gap:spacing.sm},field:{flexBasis:'47%',flexGrow:1,padding:spacing.md,backgroundColor:colors.surface,borderRadius:radius.md,gap:spacing.xs},movie:{flexDirection:'row',alignItems:'center',gap:spacing.md},moviePoster:{width:spacing.xl*2,aspectRatio:2/3,overflow:'hidden',borderRadius:radius.sm,backgroundColor:colors.surface,alignItems:'center',justifyContent:'center'},error:{gap:spacing.md}});
