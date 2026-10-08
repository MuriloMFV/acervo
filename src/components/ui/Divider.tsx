import { StyleSheet, View, type ViewProps } from 'react-native';
import { colors } from '../../theme';

export function Divider({ style, ...props }: ViewProps) {
  return <View {...props} style={[styles.divider, style]} />;
}

const styles = StyleSheet.create({
  divider: {
    alignSelf: 'stretch',
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
});
