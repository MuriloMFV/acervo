import { Pressable, StyleSheet, View } from 'react-native';
import Star from 'lucide-react-native/icons/star';
import Pencil from 'lucide-react-native/icons/pencil';
import Trash from 'lucide-react-native/icons/trash';
import { AppText, IconButton } from '../ui';
import { colors, controls, radius, spacing } from '../../theme';

export interface DetailActionBarProps {
  favorite: boolean;
  onToggleFavorite: () => void;
  onEdit: () => void;
  onRemove: () => void;
  disabled?: boolean;
}

export function DetailActionBar({ favorite, onToggleFavorite, onEdit, onRemove, disabled = false }: DetailActionBarProps) {
  return (
    <View style={styles.bar}>
      <Pressable disabled={disabled} accessibilityRole="button" accessibilityLabel={favorite ? 'Desfavoritar item' : 'Favoritar item'} accessibilityState={{ selected: favorite, disabled }} onPress={onToggleFavorite} style={({ pressed }) => [styles.button, disabled && styles.disabled, pressed && styles.pressed]}>
        <Star size={controls.iconSize} color={favorite ? colors.accent : colors.textSecondary} fill={favorite ? colors.accent : 'none'} />
        <AppText variant="label">{favorite ? 'Favorito' : 'Favoritar'}</AppText>
      </Pressable>
      <Pressable disabled={disabled} accessibilityRole="button" onPress={onEdit} style={({ pressed }) => [styles.button, disabled && styles.disabled, pressed && styles.pressed]}>
        <Pencil size={controls.iconSize} color={colors.text} />
        <AppText variant="label">Editar</AppText>
      </Pressable>
      <IconButton disabled={disabled} accessibilityLabel="Remover item" onPress={onRemove} style={styles.remove}>
        <Trash size={controls.iconSize} color={colors.textMuted} />
      </IconButton>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  button: { flexGrow: 1, minHeight: controls.minTouchSize, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surfaceElevated },
  remove: { borderRadius: radius.md },
  pressed: { opacity: controls.pressedOpacity },
  disabled: { opacity: controls.disabledOpacity },
});
