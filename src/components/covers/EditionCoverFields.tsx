import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { EditionImage } from '../add/EditionImage';
import { ActionButton } from '../ui/ActionButton';
import { EditionCoverPicker } from './EditionCoverPicker';
import { EditionBackCoverField } from './EditionBackCoverField';
import { EditionCoverPhotoButton } from './EditionCoverPhotoButton';
import { buildEditionCoverQuery } from '../../services/covers';
import type { CoverSearchParams } from '../../types/covers';
import { spacing } from '../../theme';

export function EditionCoverFields({ customCoverUrl, backCoverUrl, fallbackCoverUrl, search, onChange, onBusyChange, disabled = false }: {
  customCoverUrl: string | null; backCoverUrl: string | null; fallbackCoverUrl: string | null; search: CoverSearchParams;
  onChange: (changes: { customCoverUrl?: string | null; backCoverUrl?: string | null }) => void;
  onBusyChange?: (busy: boolean) => void; disabled?: boolean;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [frontBusy, setFrontBusy] = useState(false);
  const [backBusy, setBackBusy] = useState(false);
  const busy = frontBusy || backBusy;
  const frontCover = customCoverUrl ?? fallbackCoverUrl;
  useEffect(() => { onBusyChange?.(busy); }, [busy, onBusyChange]);
  useEffect(() => () => { onBusyChange?.(false); }, [onBusyChange]);

  return <View style={styles.fields}>
    <EditionImage key={frontCover} uri={frontCover} label="Capa da edição" />
    <ActionButton secondary label="Buscar capa" disabled={disabled || busy} onPress={() => setPickerOpen(true)} />
    <EditionCoverPhotoButton side="front" value={customCoverUrl} label="Usar minha foto como capa" disabled={disabled || backBusy} onBusyChange={setFrontBusy} onSelect={url => onChange({ customCoverUrl: url })} />
    {customCoverUrl && <ActionButton secondary label="Usar capa padrão" disabled={disabled || busy} onPress={() => onChange({ customCoverUrl: null })} />}
    <EditionBackCoverField value={backCoverUrl} onChange={url => onChange({ backCoverUrl: url })} onBusyChange={setBackBusy} search={search} disabled={disabled || frontBusy} />
    {pickerOpen && <EditionCoverPicker title={search.title} initialQuery={buildEditionCoverQuery(search)} onClose={() => setPickerOpen(false)} onSelect={url => { onChange({ customCoverUrl: url }); setPickerOpen(false); }} />}
  </View>;
}

const styles = StyleSheet.create({ fields: { gap: spacing.md } });
