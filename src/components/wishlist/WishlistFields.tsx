import {StyleSheet,View} from 'react-native';
import {AppText,Chip} from '../ui';
import {FormField} from '../ui/FormField';
import {desiredFormatLabels,priorityLabels,statusLabels,type WishlistFormValues} from '../../services/wishlist/logic';
import {spacing} from '../../theme';

export function WishlistChoices<T extends string>({label,labels,value,onChange,all=false,disabled=false}:{
  label:string;labels:Record<T,string>;value:T|null;onChange:(value:T|null)=>void;all?:boolean;disabled?:boolean;
}) {
  return <View style={styles.group}><AppText variant="label">{label}</AppText><View style={styles.choices}>
    {all&&<Chip label="Todos" selected={value===null} disabled={disabled} onPress={()=>onChange(null)} />}
    {(Object.keys(labels) as T[]).map(option=><Chip key={option} label={labels[option]} selected={value===option} disabled={disabled} onPress={()=>onChange(option)} />)}
  </View></View>;
}
export function WishlistFields({value,onChange,disabled=false}:{value:WishlistFormValues;onChange:(value:WishlistFormValues)=>void;disabled?:boolean}) {
  function change<K extends keyof WishlistFormValues>(key:K,next:WishlistFormValues[K]){onChange({...value,[key]:next});}
  return <View style={styles.fields}>
    <WishlistChoices label="Formato desejado" labels={desiredFormatLabels} value={value.format} disabled={disabled} onChange={next=>{if(next)change('format',next);}} />
    <WishlistChoices label="Prioridade" labels={priorityLabels} value={value.priority} disabled={disabled} onChange={next=>{if(next)change('priority',next);}} />
    <WishlistChoices label="Status" labels={statusLabels} value={value.status} disabled={disabled} onChange={next=>{if(next)change('status',next);}} />
    <FormField label="Preço-alvo (opcional)" keyboardType="decimal-pad" value={value.price} onChangeText={next=>change('price',next)} editable={!disabled} maxLength={13} />
    <FormField label="Observações (opcional)" multiline value={value.notes} onChangeText={next=>change('notes',next)} editable={!disabled} maxLength={4000} />
    <FormField label="Link do anúncio (opcional)" keyboardType="url" autoCapitalize="none" autoCorrect={false} value={value.listingUrl} onChangeText={next=>change('listingUrl',next)} editable={!disabled} maxLength={2048} />
  </View>;
}
const styles=StyleSheet.create({group:{gap:spacing.sm},choices:{flexDirection:'row',flexWrap:'wrap',gap:spacing.sm},fields:{gap:spacing.lg}});
