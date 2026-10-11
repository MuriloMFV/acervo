import { useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, View } from 'react-native';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import X from 'lucide-react-native/icons/x';
import { AppText, Chip, IconButton, Screen } from '../../src/components/ui';
import { FormField } from '../../src/components/ui/FormField';
import { CountrySelector } from '../../src/components/ui/CountrySelector';
import { RegionSelector } from '../../src/components/ui/RegionSelector';
import { PurchaseDateField } from '../../src/components/ui/PurchaseDateField';
import { ActionButton } from '../../src/components/ui/ActionButton';
import { ConditionSelector } from '../../src/components/collection/ConditionSelector';
import { EditionCoverPicker } from '../../src/components/covers/EditionCoverPicker';
import { BoxMoviePicker } from '../../src/components/boxes/BoxMoviePicker';
import { MediaFormatIcon } from '../../src/components/visual/AssetIcon';
import { useSuccessFeedback } from '../../src/components/visual/SuccessFeedback';
import { useSession } from '../../src/contexts/SessionContext';
import { mediaFormatLabels } from '../../src/components/movie/MediaFormatBadge';
import { colors, controls, radius, spacing } from '../../src/theme';
import { getMovieDetails } from '../../src/services/tmdb';
import { buildEditionCoverQuery } from '../../src/services/covers';
import { createCollectionBox } from '../../src/services/boxes';
import { parseBoxForm, validateBoxMovieIds } from '../../src/services/boxes/mappers';
import type { BoxFormValues } from '../../src/services/boxes/types';
import type { MovieDetails, MovieSearchCandidate } from '../../src/types/movieSearch';
import type { MediaFormat } from '../../src/services/supabase/types';
import { queryKeys } from '../../src/lib/queryClient';
import { boxQueryKeys } from '../../src/hooks/useCollectionBoxes';

const initial:BoxFormValues={name:'',mediaFormat:'DVD',barcode:'',coverUrl:'',editionName:'',publisher:'',country:'',region:'',videoStandard:null,discCount:'',special:false,limited:false,condition:'GOOD',price:'',date:'',place:'',notes:''};
export default function AddBoxScreen() {
  const router=useRouter(); const cache=useQueryClient(); const {session}=useSession(); const showSuccess=useSuccessFeedback();
  const [form,setForm]=useState(initial); const [selected,setSelected]=useState<MovieSearchCandidate[]>([]);
  const [picker,setPicker]=useState(false); const [coverPicker,setCoverPicker]=useState(false); const [extra,setExtra]=useState(false);
  const [error,setError]=useState(''); const [coverFailed,setCoverFailed]=useState(false); const saving=useRef(false);
  function change<K extends keyof BoxFormValues>(field:K,value:BoxFormValues[K]) {setForm(current=>({...current,[field]:value}));setError('');if(field==='coverUrl')setCoverFailed(false);}
  const toggle=(movie:MovieSearchCandidate)=>{
    setCoverFailed(false);
    setSelected(current=>current.some(item=>item.id===movie.id)?current.filter(item=>item.id!==movie.id):current.length<100?[...current,movie]:current);
  };
  const save=useMutation({
    mutationFn:async()=>{
      if(!session)throw new Error('Sessão indisponível.');
      const details:MovieDetails[]=[];
      // Query cache and existing TMDB service are reused without changing normal search.
      for(const movie of selected) details.push(await cache.fetchQuery({queryKey:queryKeys.movie(movie.id),queryFn:({signal})=>getMovieDetails(movie.id,signal),staleTime:300_000}));
      return createCollectionBox(form,details,session.user.id);
    },
    onSuccess:async id=>{await cache.invalidateQueries({queryKey:boxQueryKeys.collection(session!.user.id)});showSuccess();router.dismissTo({pathname:'/',params:{added:id}});},
  });
  const submit=async()=>{
    if(saving.current)return;
    try {parseBoxForm(form);validateBoxMovieIds(selected.map(movie=>movie.id));}
    catch(error){setError(error instanceof Error?error.message:'Confira os campos.');return;}
    saving.current=true;try{await save.mutateAsync();}catch{setError('Não foi possível salvar o box. Confira a conexão e se a migration foi aplicada.');}finally{saving.current=false;}
  };
  const back=()=>router.canGoBack()?router.back():router.replace('/add');
  const poster=form.coverUrl.trim()||selected[0]?.posterUrl;
  return <Screen>
    <View style={styles.header}><IconButton accessibilityLabel="Voltar" disabled={save.isPending} onPress={back}><ArrowLeft size={controls.iconSize} color={colors.textSecondary} /></IconButton><AppText variant="heading">Adicionar box</AppText></View>
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS==='ios'?'padding':'height'}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <FormField label="Nome do box" value={form.name} maxLength={200} onChangeText={value=>change('name',value)} editable={!save.isPending} />
        <AppText variant="label">Formato</AppText><View style={styles.wrap}>{(Object.keys(mediaFormatLabels) as MediaFormat[]).map(format=><Chip key={format} label={mediaFormatLabels[format]} hideLabel icon={<MediaFormatIcon format={format} color={form.mediaFormat===format?colors.onPrimary:colors.textSecondary} />} selected={form.mediaFormat===format} disabled={save.isPending} onPress={()=>change('mediaFormat',format)} />)}</View>
        <FormField label="Código de barras (opcional)" value={form.barcode} keyboardType="number-pad" maxLength={20} onChangeText={value=>change('barcode',value)} editable={!save.isPending} />
        <FormField label="Quantidade de discos (opcional)" value={form.discCount} keyboardType="number-pad" maxLength={10} onChangeText={value=>change('discCount',value)} editable={!save.isPending} />
        <AppText variant="heading">Filmes incluídos</AppText>
        <AppText variant="caption" color="textSecondary">{selected.length} filmes selecionados</AppText>
        {selected.map(movie=><View key={movie.id} style={styles.selected}><View style={styles.flex}><AppText variant="label">{movie.title}</AppText><AppText variant="caption" color="textMuted">{movie.year??'—'}</AppText></View><IconButton accessibilityLabel={`Remover ${movie.title} da seleção`} disabled={save.isPending} onPress={()=>toggle(movie)}><X size={controls.iconSize} color={colors.textSecondary} /></IconButton></View>)}
        <ActionButton secondary label="Selecionar filmes" disabled={save.isPending} onPress={()=>setPicker(true)} />
        {poster&&!coverFailed&&<Image source={{uri:poster}} style={styles.poster} resizeMode="contain" onError={()=>setCoverFailed(true)} />}
        <FormField label="URL da capa (opcional)" value={form.coverUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url" maxLength={2048} onChangeText={value=>change('coverUrl',value)} editable={!save.isPending} />
        <ActionButton secondary label="Buscar capa" disabled={save.isPending||!form.name.trim()} onPress={()=>setCoverPicker(true)} />
        {!!form.coverUrl&&<ActionButton secondary label="Usar capa de fallback" disabled={save.isPending} onPress={()=>change('coverUrl','')} />}
        <ActionButton secondary label={extra?'Menos detalhes':'Detalhes opcionais'} disabled={save.isPending} onPress={()=>setExtra(value=>!value)} />
        {extra&&<>
          <FormField label="Nome da edição" value={form.editionName} maxLength={200} onChangeText={value=>change('editionName',value)} editable={!save.isPending} />
          <FormField label="Distribuidora" value={form.publisher} maxLength={200} onChangeText={value=>change('publisher',value)} editable={!save.isPending} />
          <CountrySelector value={form.country} onChange={value=>change('country',value)} disabled={save.isPending} />
          <RegionSelector value={form.region} videoStandard={form.videoStandard ?? null} mediaFormat={form.mediaFormat} onChange={selection=>{setForm(current=>({...current,...selection}));setError('');}} disabled={save.isPending} />
          <View style={styles.selected}><AppText variant="label" style={styles.flex}>Edição especial</AppText><Switch accessibilityLabel="Edição especial" disabled={save.isPending} value={form.special} onValueChange={value=>change('special',value)} trackColor={{false:colors.border,true:colors.primary}} /></View>
          <View style={styles.selected}><AppText variant="label" style={styles.flex}>Edição limitada</AppText><Switch accessibilityLabel="Edição limitada" disabled={save.isPending} value={form.limited} onValueChange={value=>change('limited',value)} trackColor={{false:colors.border,true:colors.primary}} /></View>
        </>}
        <ConditionSelector value={form.condition} disabled={save.isPending} onChange={value=>change('condition',value)} />
        <FormField label="Preço pago (opcional)" value={form.price} keyboardType="decimal-pad" maxLength={13} onChangeText={value=>change('price',value)} editable={!save.isPending} />
        <PurchaseDateField value={form.date} disabled={save.isPending} onChange={value=>change('date',value)} />
        <FormField label="Local da compra (opcional)" value={form.place} onChangeText={value=>change('place',value)} editable={!save.isPending} />
        <FormField label="Notas (opcional)" multiline value={form.notes} onChangeText={value=>change('notes',value)} editable={!save.isPending} />
        {!!error&&<AppText accessibilityRole="alert" color="danger">{error}</AppText>}
        <ActionButton label="Adicionar box ao Acervo" busy={save.isPending} onPress={()=>{void submit();}} />
      </ScrollView>
    </KeyboardAvoidingView>
    {picker&&<BoxMoviePicker selected={selected} onToggle={toggle} onClose={()=>setPicker(false)} />}
    {coverPicker&&<EditionCoverPicker title={form.name.trim()} initialQuery={buildEditionCoverQuery({title:form.name,mediaFormat:form.mediaFormat,barcode:form.barcode,editionName:form.editionName,publisher:form.publisher,country:form.country,region:form.region})} onClose={()=>setCoverPicker(false)} onSelect={url=>{change('coverUrl',url);setCoverPicker(false);}} />}
  </Screen>;
}
const styles=StyleSheet.create({flex:{flex:1},header:{flexDirection:'row',alignItems:'center',gap:spacing.sm,paddingVertical:spacing.sm},content:{gap:spacing.md,paddingBottom:spacing.xl},wrap:{flexDirection:'row',flexWrap:'wrap',gap:spacing.sm},selected:{flexDirection:'row',alignItems:'center',gap:spacing.sm,padding:spacing.sm,backgroundColor:colors.surface,borderRadius:radius.md},poster:{width:spacing.xl*4,aspectRatio:2/3,alignSelf:'center',borderRadius:radius.md}});
