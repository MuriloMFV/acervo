import { TouchSurface as Pressable } from './TouchSurface';
import type { ReactNode } from 'react';
import { StyleSheet, type PressableProps } from 'react-native';
import { colors, controls, radius, spacing } from '../../theme';
import { AppText } from './AppText';

export interface ChipProps extends Omit<PressableProps, 'children'> {
  label: string;
  icon?: ReactNode;
  hideLabel?: boolean;
  selected?: boolean;
}

export function Chip({
  label, icon, hideLabel = false, accessibilityLabel, selected = false, disabled = false, style, accessibilityState, ...props
}: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      {...props}
      disabled={disabled}
      accessibilityState={{ ...accessibilityState, selected, disabled: disabled ?? false }}
      style={(state) => [
        styles.chip,
        selected && styles.selected,
        state.pressed && styles.pressed,
        disabled && styles.disabled,
        typeof style === 'function' ? style(state) : style,
      ]}
    >
      {icon}
      {!hideLabel && <AppText variant="label" color={selected ? 'onPrimary' : 'text'} style={styles.label}>
        {label}
      </AppText>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    maxWidth: '100%',
    minWidth: controls.minTouchSize,
    minHeight: controls.minTouchSize,
    alignSelf: 'flex-start',
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  label: { flexShrink: 1, textAlign: 'center' },
  selected: { backgroundColor: colors.primary, borderColor: colors.primary },
  pressed: { opacity: controls.pressedOpacity },
  disabled: { opacity: controls.disabledOpacity },
});
