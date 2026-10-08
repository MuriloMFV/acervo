import { StyleSheet, View, type ViewProps, type StyleProp, type TextStyle } from 'react-native';
import { colors, radius, spacing } from '../../theme';
import { AppText } from './AppText';

export interface BadgeProps extends ViewProps {
  label: string;
  tone?: 'neutral' | 'accent';
  textStyle?: StyleProp<TextStyle>;
}

export function Badge({ label, tone = 'neutral', style, textStyle, ...props }: BadgeProps) {
  const highlighted = tone === 'accent';
  return (
    <View {...props} style={[styles.badge, highlighted && styles.accent, style]}>
      <AppText variant="caption" color={highlighted ? 'accent' : 'textSecondary'} style={textStyle}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceActive,
  },
  accent: { backgroundColor: colors.accentSurface },
});
