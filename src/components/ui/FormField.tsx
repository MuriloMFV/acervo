import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { AppText } from './AppText';
import { colors, controls, radius, spacing, typography } from '../../theme';

export function FormField({ label, style, multiline = false, onFocus, onBlur, ...props }: TextInputProps & { label: string }) {
  const [focused, setFocused] = useState(false);
  return <View style={styles.field}>
    <AppText variant="label">{label}</AppText>
    <TextInput accessibilityLabel={label} placeholderTextColor={colors.textMuted} selectionColor={colors.accent} multiline={multiline} {...props} onFocus={event => { setFocused(true); onFocus?.(event); }} onBlur={event => { setFocused(false); onBlur?.(event); }} style={[styles.input, focused && styles.focused, multiline && styles.multiline, style]} />
  </View>;
}
const styles = StyleSheet.create({
  field: { gap: spacing.sm },
  input: { ...typography.body, color: colors.text, minHeight: controls.fieldMinHeight, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: spacing.md, borderRadius: radius.md },
  focused: { borderColor: colors.accent },
  multiline: { minHeight: spacing.xl * 3, textAlignVertical: 'top' },
});
