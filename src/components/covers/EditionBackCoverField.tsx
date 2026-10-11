import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { AppText } from '../ui';
import { ActionButton } from '../ui/ActionButton';
import { EditionImage } from '../add/EditionImage';
import { EditionCoverPicker } from './EditionCoverPicker';
import { EditionCoverPhotoButton } from './EditionCoverPhotoButton';
import { buildEditionBackCoverQuery } from '../../services/covers';
import type { CoverSearchParams } from '../../types/covers';
import { spacing } from '../../theme';

export function EditionBackCoverField({ value, onChange, search, onBusyChange, disabled = false }: {
  value: string | null; onChange: (url: string | null) => void; search: CoverSearchParams; onBusyChange?: (busy: boolean) => void; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const [actionsWidth, setActionsWidth] = useState(0);
  const { fontScale } = useWindowDimensions();
  const minimumWidth = 148 * Math.max(1, fontScale);
  const actionWidth = { minWidth: actionsWidth ? Math.min(actionsWidth, minimumWidth) : minimumWidth };
  const busy = disabled || picking;
  return <View style={styles.field}>
    {value && <>
      <AppText variant="label">Contracapa</AppText>
      <EditionImage key={value} uri={value} label={`Contracapa de ${search.title}`} />
    </>}
    <View style={styles.actions} onLayout={event => setActionsWidth(event.nativeEvent.layout.width)}>
      <EditionCoverPhotoButton side="back" value={value} label={value ? 'Trocar contracapa' : 'Adicionar contracapa'} disabled={disabled} onSelect={onChange} onBusyChange={value => { setPicking(value); onBusyChange?.(value); }} style={[styles.action, actionWidth]} buttonStyle={styles.button} labelStyle={styles.label} />
      <View style={[styles.action, actionWidth]}><ActionButton secondary label="Buscar contracapa na web" disabled={busy} onPress={() => setOpen(true)} style={styles.button} labelStyle={styles.label} /></View>
    </View>
    {value && <ActionButton secondary label="Remover contracapa" disabled={busy} onPress={() => onChange(null)} />}
    {open && <EditionCoverPicker side="back" title={search.title} initialQuery={buildEditionBackCoverQuery(search)} onClose={() => setOpen(false)} onSelect={url => { onChange(url); setOpen(false); }} />}
  </View>;
}
const styles = StyleSheet.create({
  field: { gap: spacing.md },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', gap: spacing.sm },
  action: { flexBasis: '46%', flexGrow: 1, flexShrink: 1 },
  button: { flexGrow: 1, minHeight: 72, paddingHorizontal: spacing.sm },
  label: { textAlign: 'center' },
});
