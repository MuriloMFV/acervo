import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import X from 'lucide-react-native/icons/x';
import { AppText, IconButton, Screen } from '../ui';
import { ActionButton } from '../ui/ActionButton';
import { useCopyPhoto } from '../../hooks/useCopyPhoto';
import { pickCopyPhoto } from '../../services/photos/picker';
import type { PhotoDraft } from '../../services/photos/validation';
import { colors, controls, radius, spacing } from '../../theme';

export function CopyPhoto({ itemId, path, draft, onChange, onEdit, onBusyChange, disabled = false }: {
  itemId: string; path: string | null; draft?: PhotoDraft; onChange?: (draft: PhotoDraft) => void; onEdit?: () => void; disabled?: boolean; onBusyChange?: (busy: boolean) => void;
}) {
  const photo = useCopyPhoto(itemId, draft?.action === 'remove' || draft?.action === 'replace' ? null : path);
  const [expanded, setExpanded] = useState(false);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState('');
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const uri = draft?.action === 'replace' ? draft.photo.uri : draft?.action === 'remove' ? null : photo.data;
  const busy = disabled || picking;
  const pick = async (source: 'camera' | 'library') => {
    setPicking(true); onBusyChange?.(true); setError('');
    try { const result = await pickCopyPhoto(source); if (result) { onChange?.({ action: 'replace', photo: result }); setFailedUri(null); } }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível escolher a foto.'); }
    finally { setPicking(false); onBusyChange?.(false); }
  };
  const choose = () => Alert.alert('Foto da minha cópia', undefined, [
    { text: 'Galeria', onPress: () => { void pick('library'); } },
    { text: 'Tirar foto', onPress: () => { void pick('camera'); } }, { text: 'Cancelar', style: 'cancel' },
  ]);
  return <View style={styles.section}>
    <AppText variant="heading">Foto da minha cópia</AppText>
    {photo.isFetching || picking ? <ActivityIndicator accessibilityLabel="Carregando foto da cópia" color={colors.accent} /> : null}
    {uri && uri !== failedUri && <Pressable accessibilityRole="button" accessibilityLabel="Ampliar foto da minha cópia" onPress={() => setExpanded(true)}>
      <Image source={{ uri }} resizeMode="contain" resizeMethod="resize" style={styles.photo} onError={() => setFailedUri(uri)} />
    </Pressable>}
    {(error || photo.isError || uri === failedUri && uri) && <View style={styles.section}><AppText accessibilityRole="alert" color="textMuted">{error || 'Não foi possível carregar a foto.'}</AppText>{path && <ActionButton secondary label="Tentar novamente" onPress={() => { setFailedUri(null); void photo.refetch(); }} />}</View>}
    {onChange ? <>
      <ActionButton secondary label={uri ? 'Trocar foto' : 'Adicionar foto'} disabled={busy} onPress={choose} />
      {(uri || path && draft?.action !== 'remove') && <ActionButton secondary label="Remover foto" disabled={busy} onPress={() => onChange({ action: 'remove' })} />}
      {draft && draft.action !== 'keep' && <ActionButton secondary label="Desfazer alteração da foto" disabled={busy} onPress={() => onChange({ action: 'keep' })} />}
    </> : onEdit && <ActionButton secondary label={path ? 'Editar foto' : 'Adicionar foto'} onPress={onEdit} />}
    {expanded && uri && <Modal animationType="fade" visible onRequestClose={() => setExpanded(false)}>
      <Screen><IconButton accessibilityLabel="Fechar foto" onPress={() => setExpanded(false)}><X size={controls.iconSize} color={colors.text} /></IconButton><Image source={{ uri }} resizeMode="contain" resizeMethod="resize" style={styles.expanded} /></Screen>
    </Modal>}
  </View>;
}
const styles = StyleSheet.create({ section: { gap: spacing.md }, photo: { width: '100%', height: spacing.xl * 7, borderRadius: radius.md, backgroundColor: colors.surface }, expanded: { flex: 1, width: '100%' } });
