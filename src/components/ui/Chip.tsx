import type { ReactNode } from 'react';
import { Pressable, StyleSheet, type PressableProps } from 'react-native';
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
      {!hideLabel && <AppText variant="label" color={selected ? 'onPrimary' : 'text'}>
        {label}
      </AppText>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minWidth: controls.minTouchSize,
    minHeight: controls.minTouchSize,
    alignSelf: 'flex-start',
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceActive,
  },
  selected: { backgroundColor: colors.primary },
  pressed: { opacity: controls.pressedOpacity },
  disabled: { opacity: controls.disabledOpacity },
});
