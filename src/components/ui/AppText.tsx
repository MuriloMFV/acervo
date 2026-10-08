import { Text, type TextProps } from 'react-native';
import { colors, typography, type TextColor, type TextVariant } from '../../theme';

export interface AppTextProps extends TextProps {
  variant?: TextVariant;
  color?: TextColor;
}

export function AppText({ variant = 'body', color = 'text', style, ...props }: AppTextProps) {
  return (
    <Text
      allowFontScaling
      accessibilityRole={variant === 'title' || variant === 'heading' ? 'header' : undefined}
      {...props}
      style={[typography[variant], { color: colors[color] }, style]}
    />
  );
}
