import { StyleSheet, TextInput, View } from 'react-native';
import Search from 'lucide-react-native/icons/search';
import X from 'lucide-react-native/icons/x';
import { IconButton } from '../ui';
import { colors, controls, radius, spacing, typography } from '../../theme';

export function MovieSearchField({ value, onChangeText }: { value: string; onChangeText: (text: string) => void }) {
  return (
    <View style={styles.field}>
      <Search size={controls.iconSize} color={colors.accent} />
      <TextInput accessibilityLabel="Buscar filme" placeholder="Buscar filme..." placeholderTextColor={colors.textMuted} selectionColor={colors.accent} value={value} onChangeText={onChangeText} autoCorrect={false} returnKeyType="search" style={styles.input} />
      {value.length > 0 && <IconButton accessibilityLabel="Limpar busca" onPress={() => onChangeText('')}><X size={controls.iconSize} color={colors.textSecondary} /></IconButton>}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.lg },
  input: { flex: 1, minWidth: 0, minHeight: controls.minTouchSize, paddingVertical: spacing.sm, ...typography.body, color: colors.text },
});
