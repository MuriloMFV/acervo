import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import { AppText, IconButton, Screen } from '../ui';
import { ActionButton } from '../ui/ActionButton';
import { VisualFeedback } from '../visual/VisualFeedback';
import { EditionImage } from './EditionImage';
import { MediaFormatBadge } from '../movie/MediaFormatBadge';
import type { BarcodeWebCandidate } from '../../types/barcodeWeb';
import { colors, controls, radius, spacing } from '../../theme';

export function BarcodeWebResults({candidates,loading,error,onRetry,onClose,onConfirm,onManual,onSearch}: {
  candidates: BarcodeWebCandidate[]; loading:boolean; error:string|null;
  onRetry:()=>void; onClose:()=>void; onConfirm:(candidate:BarcodeWebCandidate)=>void; onManual:()=>void; onSearch:()=>void;
}) {
  const [selected,setSelected] = useState<BarcodeWebCandidate|null>(null);
  const back = () => selected ? setSelected(null) : onClose();
  return <Modal visible animationType="slide" onRequestClose={back}><Screen>
    <View style={styles.header}><IconButton accessibilityLabel="Voltar" onPress={back}><ArrowLeft size={controls.iconSize} color={colors.textSecondary} /></IconButton><AppText variant="heading" style={styles.title}>{selected ? 'Possível edição encontrada' : 'Possíveis resultados'}</AppText></View>
    {selected ? <View style={styles.content}>
      {selected.imageUrl && <EditionImage uri={selected.imageUrl} label="Imagem sugerida pela web" />}
      <AppText variant="heading">{selected.detectedTitle ?? selected.title}</AppText>
      {selected.detectedFormat && <MediaFormatBadge mediaFormat={selected.detectedFormat} />}
      {selected.detectedPublisher && <AppText color="textSecondary">{selected.detectedPublisher}</AppText>}
      <AppText variant="caption" color="textMuted">Sugestão da web · {selected.sourceDomain}</AppText>
      <ActionButton label="Confirmar" onPress={()=>onConfirm(selected)} />
      <ActionButton secondary label="Não é este" onPress={()=>setSelected(null)} />
    </View> : <>
      {loading && <VisualFeedback animation="search" label="Buscando possíveis edições" />}
      {error && <View style={styles.content}><AppText accessibilityRole="alert" color="textMuted">{error}</AppText><ActionButton secondary label="Tentar novamente" onPress={onRetry} /></View>}
      <FlatList data={candidates} keyExtractor={item=>item.id} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"
        ListEmptyComponent={!loading && !error ? <VisualFeedback animation="film" loop={false} label="Nenhuma edição encontrada" /> : null}
        renderItem={({item})=><Pressable accessibilityRole="button" accessibilityLabel={`Selecionar ${item.title}`} onPress={()=>setSelected(item)} style={styles.card}>
          <AppText variant="label" numberOfLines={2}>{item.title}</AppText>
          {!!item.snippet && <AppText variant="caption" color="textSecondary" numberOfLines={2}>{item.snippet}</AppText>}
          <AppText variant="caption" color="textMuted">{item.sourceDomain}</AppText>
        </Pressable>} />
      <View style={styles.footer}>{candidates.length ? <ActionButton secondary label="Nenhum desses" onPress={onManual} /> : <><ActionButton label="Buscar filme" onPress={onSearch} /><ActionButton secondary label="Cadastro manual" onPress={onManual} /></>}</View>
    </>}
  </Screen></Modal>;
}
const styles=StyleSheet.create({header:{flexDirection:'row',alignItems:'center',gap:spacing.md,paddingVertical:spacing.md},title:{flex:1},content:{gap:spacing.md,paddingVertical:spacing.md},card:{padding:spacing.md,gap:spacing.sm,backgroundColor:colors.surface,borderRadius:radius.md},footer:{paddingVertical:spacing.md,gap:spacing.sm}});
