import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import CalendarDays from 'lucide-react-native/icons/calendar-days';
import { AppText } from './AppText';
import { ActionButton } from './ActionButton';
import { Screen } from './Screen';
import { calendarDateFromISO, calendarDateToISO, displayCalendarDate } from '../../utils/calendarDate';
import { colors, controls, radius, spacing } from '../../theme';

export function PurchaseDateField({ value, onChange, disabled = false }: { value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(new Date());
  const start = () => { setDraft(value ? calendarDateFromISO(value) : new Date()); setOpen(true); };
  return <View style={styles.field}>
    <AppText variant="label" color="textSecondary">Data de compra</AppText>
    <Pressable accessibilityRole="button" accessibilityLabel={`Data de compra: ${value ? displayCalendarDate(value) : 'Selecionar data'}`} accessibilityState={{ disabled }} disabled={disabled} onPress={start} style={styles.input}>
      <CalendarDays size={controls.iconSize} color={colors.accent} />
      <AppText color={value ? 'text' : 'textMuted'}>{value ? displayCalendarDate(value) : 'Selecionar data'}</AppText>
    </Pressable>
    {value && <Pressable accessibilityRole="button" disabled={disabled} onPress={() => onChange('')} style={styles.clear}><AppText variant="caption" color="accent">Remover data</AppText></Pressable>}
    {open && Platform.OS === 'android' && <DateTimePicker value={draft} mode="date" display="default" onChange={(event, date) => { setOpen(false); if (event.type === 'set' && date) onChange(calendarDateToISO(date)); }} />}
    {open && Platform.OS === 'ios' && <Modal transparent animationType="slide" onRequestClose={() => setOpen(false)}>
      <View style={styles.overlay}><Screen edges={['bottom']} style={styles.sheet}>
        <DateTimePicker value={draft} mode="date" display="spinner" locale="pt-BR" themeVariant="dark" textColor={colors.text} onChange={(_, date) => { if (date) setDraft(date); }} />
        <ActionButton label="Confirmar data" onPress={() => { onChange(calendarDateToISO(draft)); setOpen(false); }} />
        <ActionButton secondary label="Cancelar" onPress={() => setOpen(false)} />
      </Screen></View>
    </Modal>}
  </View>;
}
const styles = StyleSheet.create({
  field: { gap: spacing.sm }, input: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: controls.minTouchSize, padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  clear: { minHeight: controls.minTouchSize, justifyContent: 'center', alignSelf: 'flex-start' },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.background }, sheet: { flex: 0, gap: spacing.md, paddingTop: spacing.md, backgroundColor: colors.surfaceElevated, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
});
