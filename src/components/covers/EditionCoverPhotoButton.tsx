import { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { AppText } from '../ui';
import { ActionButton } from '../ui/ActionButton';
import { useSession } from '../../contexts/SessionContext';
import { uploadEditionCoverPhoto } from '../../services/covers/photo';
import { pickCopyPhoto } from '../../services/photos/picker';
import { spacing } from '../../theme';

export function EditionCoverPhotoButton({ label, side, value, onSelect, onBusyChange, disabled = false, style, buttonStyle, labelStyle }: {
  label: string; side: 'front' | 'back'; value?: string | null; onSelect: (url: string) => void; onBusyChange?: (busy: boolean) => void; disabled?: boolean;
  style?: StyleProp<ViewStyle>; buttonStyle?: StyleProp<ViewStyle>; labelStyle?: StyleProp<TextStyle>;
}) {
  const { session } = useSession();
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState('');
  const locked = useRef(false);
  const active = useRef(false);
  const currentUserId = useRef(session?.user.id);
  currentUserId.current = session?.user.id;
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  useEffect(() => setError(''), [value]);
  const coverLabel = side === 'back' ? 'contracapa' : 'capa';
  const pick = async (source: 'camera' | 'library') => {
    if (locked.current || disabled) return;
    locked.current = true;
    setPicking(true); setError(''); onBusyChange?.(true);
    const userId = currentUserId.current;
    try {
      if (!userId) throw new Error('Entre para continuar.');
      const photo = await pickCopyPhoto(source);
      if (!photo || !active.current) return;
      const url = await uploadEditionCoverPhoto(userId, photo, side);
      if (active.current && currentUserId.current === userId) onSelect(url);
    } catch (cause) {
      if (active.current) setError(cause instanceof Error ? cause.message : `Não foi possível escolher a ${coverLabel}.`);
    } finally {
      locked.current = false;
      if (active.current) { setPicking(false); onBusyChange?.(false); }
    }
  };
  const choose = () => Alert.alert(`Foto da ${coverLabel}`, undefined, [
    { text: 'Escolher da galeria', onPress: () => { void pick('library'); } },
    { text: 'Tirar foto', onPress: () => { void pick('camera'); } },
    { text: 'Cancelar', style: 'cancel' },
  ]);
  return <View style={[styles.field, style]}>
    <ActionButton secondary label={picking ? `Preparando ${coverLabel}` : label} busy={picking} disabled={disabled} onPress={choose} style={buttonStyle} labelStyle={labelStyle} />
    {!!error && <AppText accessibilityRole="alert" color="textMuted">{error}</AppText>}
  </View>;
}
const styles = StyleSheet.create({ field: { gap: spacing.md } });
