import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FlatList, Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import { AppText, IconButton, Screen } from '../ui';
import { FormField } from '../ui/FormField';
import { VisualFeedback } from '../visual/VisualFeedback';
import { ActionButton } from '../ui/ActionButton';
import { useSession } from '../../contexts/SessionContext';
import { saveEditionCover, searchEditionCovers } from '../../services/covers';
import type { EditionCoverCandidate } from '../../types/covers';
import { colors, controls, radius, spacing } from '../../theme';

export function EditionCoverPicker({ initialQuery, title, side = 'front', onClose, onSelect }: {
  initialQuery: string; title: string; side?: 'front' | 'back'; onClose: () => void; onSelect: (url: string) => void;
}) {
  const coverLabel = side === 'back' ? 'contracapa' : 'capa';
  const { session } = useSession();
  const cache = useQueryClient();
  const [input, setInput] = useState(initialQuery);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<EditionCoverCandidate | null>(null);
  const [failed, setFailed] = useState<string[]>([]);
  const [previewFailed, setPreviewFailed] = useState(false);
  const copying = useRef(false);
  const options = {
    queryKey: ['edition-covers', session?.user.id, query] as const,
    queryFn: () => searchEditionCovers(query),
    staleTime: 10 * 60_000, gcTime: 15 * 60_000, retry: false as const,
    refetchOnWindowFocus: false, refetchOnReconnect: false,
  };
  const results = useQuery({ ...options, enabled: !!query && !!session });
  const copy = useMutation({ mutationFn: saveEditionCover, onSuccess: onSelect });
  useEffect(() => setFailed([]), [results.data]);
  const search = () => {
    const next = input.replace(/\s+/g, ' ').trim();
    if (next.length < 2 || next.length > 240) return;
    setSelected(null); copy.reset();
    if (next !== query) setQuery(next);
    else void cache.fetchQuery(options).catch(() => { /* Query renders error. */ });
  };
  const choose = async () => {
    if (!selected || copying.current) return;
    copying.current = true;
    try { await copy.mutateAsync(selected); } catch { /* Mutation renders error. */ }
    finally { copying.current = false; }
  };
  const back = () => {
    if (copying.current) return;
    if (selected) { setSelected(null); copy.reset(); setPreviewFailed(false); }
    else onClose();
  };
  return <Modal visible animationType="slide" onRequestClose={back}>
    <Screen>
      <View style={styles.header}>
        <IconButton accessibilityLabel="Voltar" disabled={copy.isPending} onPress={back}><ArrowLeft size={controls.iconSize} color={colors.textSecondary} /></IconButton>
        <AppText variant="heading">{selected ? `Confirmar ${coverLabel}` : `Buscar ${coverLabel}`}</AppText>
      </View>
      {selected ? <View style={styles.confirm}>
        <Image source={{ uri: selected.imageUrl }} style={styles.preview} resizeMode="contain" resizeMethod="resize" accessibilityLabel={`${side === 'back' ? 'Contracapa' : 'Capa'} de ${title}`} onError={() => setPreviewFailed(true)} />
        <AppText variant="heading">{title}</AppText>
        {!!selected.sourceTitle && <AppText variant="caption" color="textMuted" numberOfLines={2}>{selected.sourceTitle}</AppText>}
        {(previewFailed || copy.isError) && <AppText accessibilityRole="alert" color="textMuted">{previewFailed ? 'Imagem indisponível' : copy.error?.message}</AppText>}
        <ActionButton label={`Usar esta ${coverLabel}`} busy={copy.isPending} disabled={previewFailed} onPress={() => { void choose(); }} />
        <ActionButton secondary label="Escolher outra" disabled={copy.isPending} onPress={back} />
      </View> : <>
        <FormField label="Busca" value={input} onChangeText={setInput} maxLength={240} returnKeyType="search" onSubmitEditing={search} />
        <View style={styles.search}><ActionButton label="Pesquisar" busy={results.isFetching} disabled={input.trim().length < 2} onPress={search} /></View>
        {results.isFetching && <VisualFeedback animation="search" label={side === 'back' ? 'Buscando contracapas' : 'Buscando capas'} />}
        {results.isError && <AppText accessibilityRole="alert" color="textMuted">{results.error.message}</AppText>}
        <FlatList data={(results.data ?? []).filter(item => !failed.includes(item.id))} numColumns={2} keyExtractor={item => item.id}
          columnWrapperStyle={styles.row} contentContainerStyle={styles.grid} keyboardShouldPersistTaps="handled"
          ListEmptyComponent={query && !results.isFetching && !results.isError ? <VisualFeedback animation="film" loop={false} label={`Nenhuma ${coverLabel} encontrada`} /> : null}
          renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`Escolher ${coverLabel} ${item.sourceTitle}`} onPress={() => { setPreviewFailed(false); setSelected(item); }} style={styles.card}>
            <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnail} resizeMode="contain" resizeMethod="resize" onError={() => setFailed(old => [...old, item.id])} />
          </Pressable>} />
        <View style={styles.search}><ActionButton secondary label={side === 'back' ? 'Pular contracapa' : 'Voltar sem escolher'} onPress={onClose} /></View>
      </>}
    </Screen>
  </Modal>;
}
const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  search: { paddingVertical: spacing.md }, grid: { gap: spacing.md, paddingVertical: spacing.md }, row: { gap: spacing.md },
  card: { width: '47%', aspectRatio: 2 / 3, borderRadius: radius.md, backgroundColor: colors.surface, overflow: 'hidden' },
  thumbnail: { width: '100%', height: '100%' },
  confirm: { flex: 1, gap: spacing.md, paddingBottom: spacing.lg }, preview: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md },
});
