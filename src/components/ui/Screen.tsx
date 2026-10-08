import { StyleSheet } from 'react-native';
import { SafeAreaView, type SafeAreaViewProps } from 'react-native-safe-area-context';
import { colors, spacing } from '../../theme';

export function Screen({ style, ...props }: SafeAreaViewProps) {
  return <SafeAreaView {...props} style={[styles.screen, style]} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.page,
  },
});
