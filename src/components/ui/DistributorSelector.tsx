import { useMemo, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import X from 'lucide-react-native/icons/x';
import Check from 'lucide-react-native/icons/check';
import { AppText } from './AppText';
import { Screen } from './Screen';
import { IconButton } from './IconButton';
import { FormField } from './FormField';
import { ActionButton } from './ActionButton';
import { DistributorLogo } from '../visual/DistributorLogo';
import { distributorName, findDistributor, searchDistributors } from '../../utils/distributors';
import { colors, controls, radius, spacing } from '../../theme';

export function DistributorSelector({ value, onChange, disabled = false }: {
  value: string; onChange: (publisher: string) => void; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [manual, setManual] = useState(false);
  const [search, setSearch] = useState('');
  const [customName, setCustomName] = useState('');
  const selected = findDistributor(value);
  const choices = useMemo(() => searchDistributors(search), [search]);
  const close = () => setOpen(false);
  const choose = (publisher: string) => { if (!disabled) onChange(publisher); close(); };
  const startManual = () => { setCustomName(search.trim() || value); setManual(true); };

  return <View style={styles.field}>
    <AppText variant="label">Distribuidora</AppText>
    <Pressable accessibilityRole="button" accessibilityLabel={`Distribuidora: ${distributorName(value) || 'Não informado'}. Selecionar distribuidora`} accessibilityState={{ disabled }} disabled={disabled} onPress={() => { setSearch(''); setManual(false); setOpen(true); }} style={({ pressed }) => [styles.input, disabled && styles.disabled, pressed && styles.pressed]}>
      {selected && <DistributorLogo id={selected.id} width={64} height={44} />}
      <AppText color={value ? 'text' : 'textMuted'} style={styles.name}>{distributorName(value) || 'Selecionar distribuidora'}</AppText>
      <ChevronDown accessible={false} size={controls.iconSize} color={colors.textMuted} />
    </Pressable>
    <Modal visible={open} animationType="slide" onRequestClose={close}>
      <Screen>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.header}>
            {manual && <IconButton accessibilityLabel="Voltar à lista de distribuidoras" onPress={() => setManual(false)}><ArrowLeft size={controls.iconSize} color={colors.text} /></IconButton>}
            <AppText variant="heading" style={styles.name}>{manual ? 'Outra distribuidora' : 'Distribuidora'}</AppText>
            <IconButton accessibilityLabel="Fechar seleção de distribuidora" onPress={close}><X size={controls.iconSize} color={colors.text} /></IconButton>
          </View>
          {manual ? <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.manual}>
            <FormField label="Nome da distribuidora" value={customName} onChangeText={setCustomName} maxLength={200} editable={!disabled} autoFocus autoCorrect={false} placeholder="Digite o nome" />
            <ActionButton label="Usar esta distribuidora" disabled={disabled || !customName.trim()} onPress={() => choose(customName.trim())} />
          </ScrollView> : <>
            <View style={styles.search}><FormField label="Buscar distribuidora" value={search} onChangeText={setSearch} autoCorrect={false} autoCapitalize="none" placeholder="Nome da distribuidora" /></View>
            <FlatList data={choices} keyExtractor={distributor => distributor.id} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.list}
              ListHeaderComponent={<Pressable accessibilityRole="button" accessibilityState={{ selected: !value.trim(), disabled }} disabled={disabled} onPress={() => choose('')} style={({ pressed }) => [styles.option, pressed && styles.pressed]}><AppText color="textMuted" style={styles.name}>Não informado</AppText>{!value.trim() && <Check accessible={false} size={controls.iconSize} color={colors.accent} />}</Pressable>}
              ListEmptyComponent={<AppText color="textMuted" style={styles.empty}>Nenhuma distribuidora encontrada.</AppText>}
              renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={item.name} accessibilityState={{ selected: selected?.id === item.id, disabled }} disabled={disabled} onPress={() => choose(item.name)} style={({ pressed }) => [styles.option, selected?.id === item.id && styles.selected, pressed && styles.pressed]}>
                <DistributorLogo id={item.id} /><AppText style={styles.name}>{item.name}</AppText>{selected?.id === item.id && <Check accessible={false} size={controls.iconSize} color={colors.accent} />}
              </Pressable>} />
            <View style={styles.footer}><ActionButton secondary label="Outra distribuidora" disabled={disabled} onPress={startManual} /></View>
          </>}
        </KeyboardAvoidingView>
      </Screen>
    </Modal>
  </View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, field: { gap: spacing.sm }, name: { flex: 1 },
  input: { flexDirection: 'row', alignItems: 'center', minHeight: controls.minTouchSize, gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceElevated },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  search: { paddingBottom: spacing.sm }, list: { gap: spacing.xs, paddingBottom: spacing.md },
  option: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: controls.minTouchSize, padding: spacing.sm, borderRadius: radius.md },
  selected: { backgroundColor: colors.accentSurface }, empty: { paddingVertical: spacing.md },
  manual: { gap: spacing.md, paddingBottom: spacing.lg }, footer: { paddingVertical: spacing.sm },
  pressed: { opacity: controls.pressedOpacity }, disabled: { opacity: controls.disabledOpacity },
});
