import { useMemo, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Platform, StyleSheet, View } from 'react-native';
import X from 'lucide-react-native/icons/x';
import { MovieSearchField } from '../add/MovieSearchField';
import { MovieSearchResult } from '../add/MovieSearchResult';
import { AppText, IconButton, Screen } from '../ui';
import { ActionButton } from '../ui/ActionButton';
import { useMovieSearch } from '../../hooks/useMovieSearch';
import type { MovieSearchCandidate } from '../../types/movieSearch';
import { colors, controls, spacing } from '../../theme';

export function BoxMoviePicker({ selected, onToggle, onClose }: {
  selected: readonly MovieSearchCandidate[]; onToggle: (movie: MovieSearchCandidate) => void; onClose: () => void;
}) {
  const [search,setSearch]=useState('');
  const {results,status,retry}=useMovieSearch(search);
  const ids=useMemo(()=>new Set(selected.map(movie=>movie.id)),[selected]);
  return <Modal visible animationType="slide" onRequestClose={onClose}><Screen>
    <View style={styles.header}><AppText variant="heading" style={styles.title}>Filmes do box</AppText><IconButton accessibilityLabel="Concluir seleção" onPress={onClose}><X size={controls.iconSize} color={colors.text} /></IconButton></View>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <MovieSearchField value={search} onChangeText={setSearch} />
    <FlatList data={results} keyExtractor={movie=>movie.id} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" initialNumToRender={8}
      contentContainerStyle={styles.results}
      renderItem={({item})=><View style={styles.result}><MovieSearchResult movie={item} onPress={()=>onToggle(item)} />{ids.has(item.id)&&<AppText variant="caption" color="accent">Selecionado · toque para remover</AppText>}</View>}
      ListEmptyComponent={status==='loading'?<AppText color="textMuted">Buscando…</AppText>:status==='error'?<View style={styles.result}><AppText color="textMuted">Não foi possível buscar agora</AppText><ActionButton secondary label="Tentar novamente" onPress={retry} /></View>:status==='success'?<AppText color="textMuted">Nenhum filme encontrado</AppText>:null}
    />
    <View style={styles.footer}><AppText variant="caption" color="textSecondary">{selected.length} filmes selecionados</AppText><ActionButton label="Concluir seleção" onPress={onClose} /></View>
    </KeyboardAvoidingView>
  </Screen></Modal>;
}
const styles=StyleSheet.create({header:{flexDirection:'row',alignItems:'center',gap:spacing.sm,paddingVertical:spacing.md},title:{flex:1},results:{paddingVertical:spacing.md,gap:spacing.sm},result:{gap:spacing.xs},footer:{gap:spacing.sm,paddingVertical:spacing.md}});
