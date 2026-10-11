import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { AppText } from './AppText';
import { colors, controls, radius, spacing } from '../../theme';

export function ActionButton({ label, onPress, busy = false, disabled = false, secondary = false, style, labelStyle }: {
  label: string; onPress: () => void; busy?: boolean; disabled?: boolean; secondary?: boolean;
  style?: StyleProp<ViewStyle>; labelStyle?: StyleProp<TextStyle>;
}) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: disabled || busy, busy }} disabled={disabled || busy} onPress={onPress} style={({ pressed }) => [styles.button, secondary && styles.secondary, style, (disabled || busy) && styles.disabled, pressed && styles.pressed]}>
    {busy ? <ActivityIndicator accessibilityLabel={label} color={secondary ? colors.accent : colors.onPrimary} /> : <AppText variant="label" color={secondary ? 'accent' : 'onPrimary'} style={labelStyle}>{label}</AppText>}
  </Pressable>;
}
const styles = StyleSheet.create({
  button: { minHeight: controls.minTouchSize, alignItems: 'center', justifyContent: 'center', padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.surfaceElevated },
  pressed: { opacity: controls.pressedOpacity },
  disabled: { opacity: controls.disabledOpacity },
});
