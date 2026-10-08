import Search from 'lucide-react-native/icons/search';
import X from 'lucide-react-native/icons/x';
import { IconButton } from '../ui';
import { StyleSheet, TextInput, View } from 'react-native';
import { colors, controls, radius, spacing, typography } from '../../theme';

export interface CollectionSearchBarProps {
  value: string;
  onChangeText: (value: string) => void;
}

export function CollectionSearchBar({ value, onChangeText }: CollectionSearchBarProps) {
  return (
    <View style={styles.container}>
      <Search size={controls.iconSize} color={colors.textMuted} />
      <TextInput
        accessibilityLabel="Buscar no meu acervo"
        placeholder="Buscar no meu acervo..."
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.accent}
        value={value}
        onChangeText={onChangeText}
        autoCorrect={false}
        returnKeyType="search"
        style={styles.input}
      />
      {value.length > 0 && (
        <IconButton accessibilityLabel="Limpar busca" onPress={() => onChangeText('')}>
          <X size={controls.iconSize} color={colors.textSecondary} />
        </IconButton>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.surfaceElevated, borderRadius: radius.lg,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
  },
  input: {
    flex: 1, minWidth: 0, minHeight: controls.minTouchSize,
    ...typography.body, color: colors.text, paddingVertical: spacing.sm,
  },
});
