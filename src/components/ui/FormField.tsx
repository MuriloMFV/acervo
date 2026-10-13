import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { AppText } from './AppText';
import { colors, controls, radius, spacing, typography } from '../../theme';

export function FormField({ label, style, multiline = false, ...props }: TextInputProps & { label: string }) {
  return <View style={styles.field}>
    <AppText variant="label">{label}</AppText>
    <TextInput accessibilityLabel={label} placeholderTextColor={colors.textMuted} selectionColor={colors.accent} multiline={multiline} {...props} style={[styles.input, multiline && styles.multiline, style]} />
  </View>;
}
const styles = StyleSheet.create({
  field: { gap: spacing.sm },
  input: { ...typography.body, color: colors.text, minHeight: controls.fieldMinHeight, backgroundColor: colors.surfaceElevated, padding: spacing.md, borderRadius: radius.md },
  multiline: { minHeight: spacing.xl * 3, textAlignVertical: 'top' },
});
