import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewProps, type StyleProp, type TextStyle } from 'react-native';
import { colors, radius, spacing } from '../../theme';
import { AppText } from './AppText';

export interface BadgeProps extends ViewProps {
  label: string;
  icon?: ReactNode;
  hideLabel?: boolean;
  tone?: 'neutral' | 'accent';
  textStyle?: StyleProp<TextStyle>;
}

export function Badge({ label, icon, hideLabel = false, tone = 'neutral', style, textStyle, ...props }: BadgeProps) {
  const highlighted = tone === 'accent';
  return (
    <View accessible={hideLabel || undefined} accessibilityLabel={hideLabel ? label : undefined} {...props} style={[styles.badge, highlighted && styles.accent, style]}>
      {icon}
      {!hideLabel && <AppText variant="caption" color={highlighted ? 'accent' : 'textSecondary'} style={[styles.label, textStyle]}>
        {label}
      </AppText>}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    maxWidth: '100%',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceActive,
  },
  label: { flexShrink: 1 },
  accent: { backgroundColor: colors.accentSurface },
});
