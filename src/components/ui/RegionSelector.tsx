import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import X from 'lucide-react-native/icons/x';
import Check from 'lucide-react-native/icons/check';
import { AppText } from './AppText';
import { Screen } from './Screen';
import { IconButton } from './IconButton';
import { FormField } from './FormField';
import { ActionButton } from './ActionButton';
import { VideoStandardIcon } from '../visual/VideoStandardIcon';
import { regionChoices, regionLabel, regionSelection } from '../../utils/regions';
import { regionEncodingDraft, type RegionEncodingSelection } from '../../utils/videoStandard';
import { videoStandards, type VideoStandard } from '../../types/videoStandard';
import type { MediaFormat } from '../../types/collectionPreview';
import { colors, controls, radius, spacing } from '../../theme';

const encodings = [null, ...videoStandards];

export function RegionSelector({ value, videoStandard, mediaFormat, onChange, disabled = false }: {
  value: string; videoStandard: VideoStandard | null; mediaFormat: MediaFormat | null;
  onChange: (selection: RegionEncodingSelection) => void; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [draft, setDraft] = useState(() => regionEncodingDraft(value, videoStandard));
  const [custom, setCustom] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const saved = regionEncodingDraft(value, videoStandard);
  const close = () => setOpen(false);
  const start = () => {
    setDraft(regionEncodingDraft(value, videoStandard));
    setStep(1); setCustom(false); setOpen(true);
  };
  const chooseRegion = (region: string) => {
    if (disabled) return;
    setDraft(previous => ({ ...previous, region })); setCustom(false); setStep(2);
  };
  const confirm = () => { if (!disabled) onChange(draft); close(); };
  return <View style={styles.field}>
    <AppText variant="label">Região / codificação</AppText>
    <Pressable accessibilityRole="button" accessibilityLabel={'Região: ' + regionLabel(saved.region) + '. Codificação: ' + (saved.videoStandard ?? 'Não informada') + '. Selecionar'} accessibilityState={{ disabled }} disabled={disabled} onPress={start} style={({ pressed }) => [styles.input, disabled && styles.disabled, pressed && styles.pressed]}>
      {saved.videoStandard && <VideoStandardIcon value={saved.videoStandard} width={60} height={32} />}
      <View style={styles.name}>
        <AppText color={saved.region ? 'text' : 'textMuted'}>{regionLabel(saved.region)}</AppText>
        <AppText variant="caption" color="textMuted">{saved.videoStandard ?? 'Codificação não informada'}</AppText>
      </View>
      <ChevronDown accessible={false} size={controls.iconSize} color={colors.textMuted} />
    </Pressable>
    <Modal visible={open} animationType="slide" onRequestClose={close}>
      <Screen>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.header}>
            <AppText variant="heading" style={styles.name}>Região e codificação</AppText>
            <IconButton accessibilityLabel="Fechar seleção" onPress={close}><X size={controls.iconSize} color={colors.text} /></IconButton>
          </View>
          <View style={styles.header}><AppText variant="label" style={styles.name}>{step === 1 ? 'Região' : 'Codificação'}</AppText><AppText variant="caption" color="textMuted">{step} de 2</AppText></View>
          {step === 2 && <AppText variant="caption" color="textMuted" style={styles.summary}>{regionLabel(draft.region)}</AppText>}
          <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
            {step === 1 ? custom ? <>
              <FormField label="Outra região" value={customValue} onChangeText={setCustomValue} maxLength={200} editable={!disabled} autoFocus />
              <ActionButton label="Continuar para codificação" disabled={disabled || !customValue.trim() || customValue.trim().length > 200} onPress={() => chooseRegion(customValue.trim())} />
              <ActionButton secondary label="Voltar às opções" onPress={() => setCustom(false)} />
            </> : <>
              {regionChoices(mediaFormat, draft.region).map(option => <Pressable key={option.value} accessibilityRole="button" accessibilityLabel={option.label} accessibilityState={{ selected: regionSelection(option.value) === regionSelection(draft.region), disabled }} disabled={disabled} onPress={() => chooseRegion(option.value)} style={({ pressed }) => [styles.option, regionSelection(option.value) === regionSelection(draft.region) && styles.selected, disabled && styles.disabled, pressed && styles.pressed]}>
                <AppText style={styles.name}>{option.label}</AppText>
                {regionSelection(option.value) === regionSelection(draft.region) && <Check accessible={false} size={controls.iconSize} color={colors.accent} />}
              </Pressable>)}
              <ActionButton secondary label="Outra região" disabled={disabled} onPress={() => { setCustomValue(draft.region); setCustom(true); }} />
            </> : encodings.map(encoding => <Pressable key={encoding ?? 'unspecified'} accessibilityRole="button" accessibilityLabel={encoding ?? 'Não informado'} accessibilityState={{ selected: encoding === draft.videoStandard, disabled }} disabled={disabled} onPress={() => setDraft(previous => ({ ...previous, videoStandard: encoding }))} style={({ pressed }) => [styles.option, encoding === draft.videoStandard && styles.selected, disabled && styles.disabled, pressed && styles.pressed]}>
              {encoding && <VideoStandardIcon value={encoding} />}
              <AppText style={styles.name}>{encoding ?? 'Não informado'}</AppText>
              {encoding === draft.videoStandard && <Check accessible={false} size={controls.iconSize} color={colors.accent} />}
            </Pressable>)}
          </ScrollView>
          {step === 2 && <View style={styles.footer}>
            <ActionButton label="Concluir" disabled={disabled} onPress={confirm} />
            <ActionButton secondary label="Voltar à região" disabled={disabled} onPress={() => setStep(1)} />
          </View>}
        </KeyboardAvoidingView>
      </Screen>
    </Modal>
  </View>;
}
const styles = StyleSheet.create({
  flex: { flex: 1 }, field: { gap: spacing.sm }, name: { flex: 1 },
  input: { flexDirection: 'row', alignItems: 'center', minHeight: controls.fieldMinHeight, gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceElevated },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  summary: { paddingBottom: spacing.md }, list: { gap: spacing.sm, paddingBottom: spacing.lg },
  footer: { gap: spacing.sm, paddingVertical: spacing.sm },
  option: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: controls.minTouchSize, padding: spacing.md, borderRadius: radius.md },
  selected: { backgroundColor: colors.accentSurface }, pressed: { opacity: controls.pressedOpacity }, disabled: { opacity: controls.disabledOpacity },
});
