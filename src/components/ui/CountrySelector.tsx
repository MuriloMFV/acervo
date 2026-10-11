import { useMemo, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import X from 'lucide-react-native/icons/x';
import Check from 'lucide-react-native/icons/check';
import { AppText } from './AppText';
import { Screen } from './Screen';
import { IconButton } from './IconButton';
import { FormField } from './FormField';
import { ActionButton } from './ActionButton';
import { countryFlag, countryName, findCountry, searchCountries } from '../../utils/countries';
import { colors, controls, radius, spacing } from '../../theme';

export function CountrySelector({ value, onChange, disabled = false }: {
  value: string; onChange: (country: string) => void; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const selected = findCountry(value);
  const choices = useMemo(() => searchCountries(search), [search]);
  const close = () => setOpen(false);
  const choose = (country: string) => { if (!disabled) onChange(country); close(); };
  return <View style={styles.field}>
    <AppText variant="label">País</AppText>
    <Pressable accessibilityRole="button" accessibilityLabel={`País: ${countryName(value) || 'Não informado'}. Selecionar país`} accessibilityState={{ disabled }} disabled={disabled} onPress={() => { setSearch(''); setOpen(true); }} style={({ pressed }) => [styles.input, disabled && styles.disabled, pressed && styles.pressed]}>
      {selected && <Text accessible={false} style={styles.flag}>{countryFlag(selected.code)}</Text>}
      <AppText color={value ? 'text' : 'textMuted'} style={styles.name}>{countryName(value) || 'Selecionar país'}</AppText>
      <ChevronDown size={controls.iconSize} color={colors.textMuted} accessible={false} />
    </Pressable>
    <Modal visible={open} animationType="slide" onRequestClose={close}>
      <Screen>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}><AppText variant="heading" style={styles.name}>País</AppText><IconButton accessibilityLabel="Fechar seleção de país" onPress={close}><X size={controls.iconSize} color={colors.text} /></IconButton></View>
        <View style={styles.search}><FormField label="Buscar país" value={search} onChangeText={setSearch} autoCorrect={false} autoCapitalize="none" placeholder="Nome ou sigla" /><ActionButton secondary label="Não informado" disabled={disabled} onPress={() => choose('')} /></View>
        {!!value && !selected && <AppText variant="caption" color="textMuted" style={styles.legacy}>Atual: {value}</AppText>}
        <FlatList data={choices} keyExtractor={country => country.code} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.list} ListEmptyComponent={<AppText color="textMuted">Nenhum país encontrado.</AppText>} renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={item.name} accessibilityState={{ selected: selected?.code === item.code, disabled }} disabled={disabled} onPress={() => choose(item.name)} style={({ pressed }) => [styles.option, selected?.code === item.code && styles.selected, pressed && styles.pressed]}>
          <Text accessible={false} style={styles.flag}>{countryFlag(item.code)}</Text><AppText style={styles.name}>{item.name}</AppText>{selected?.code === item.code && <Check accessible={false} size={controls.iconSize} color={colors.accent} />}
        </Pressable>} />
        </KeyboardAvoidingView>
      </Screen>
    </Modal>
  </View>;
}
const styles = StyleSheet.create({
  flex: { flex: 1 },
  field: { gap: spacing.sm }, input: { flexDirection: 'row', alignItems: 'center', minHeight: controls.minTouchSize, gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceElevated },
  flag: { fontSize: 24 }, name: { flex: 1 }, header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  search: { gap: spacing.sm, paddingBottom: spacing.md }, list: { gap: spacing.xs, paddingBottom: spacing.lg },
  option: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: controls.minTouchSize, padding: spacing.md, borderRadius: radius.md },
  selected: { backgroundColor: colors.accentSurface }, legacy: { paddingBottom: spacing.sm }, pressed: { opacity: controls.pressedOpacity }, disabled: { opacity: controls.disabledOpacity },
});
