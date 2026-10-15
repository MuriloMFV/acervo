import { TouchSurface as Pressable } from './TouchSurface';
import type { ReactNode } from 'react';
import { StyleSheet, type PressableProps } from 'react-native';
import { colors, controls, radius, spacing } from '../../theme';

export interface IconButtonProps extends Omit<PressableProps, 'children' | 'accessibilityLabel'> {
  accessibilityLabel: string;
  children: ReactNode;
  selected?: boolean;
}

export function IconButton({
  children, selected = false, disabled = false, style, accessibilityState, ...props
}: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      {...props}
      disabled={disabled}
      accessibilityState={{ ...accessibilityState, selected, disabled: disabled ?? false }}
      style={(state) => [
        styles.button,
        selected && styles.selected,
        state.pressed && styles.pressed,
        disabled && styles.disabled,
        typeof style === 'function' ? style(state) : style,
      ]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: controls.minTouchSize,
    minHeight: controls.minTouchSize,
    padding: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    backgroundColor: colors.surfaceElevated,
  },
  selected: { backgroundColor: colors.primary },
  pressed: { opacity: controls.pressedOpacity },
  disabled: { opacity: controls.disabledOpacity },
});
