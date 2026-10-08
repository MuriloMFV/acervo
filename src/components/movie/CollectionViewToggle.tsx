import Grid3X3 from 'lucide-react-native/icons/grid-3x3';
import List from 'lucide-react-native/icons/list';
import { StyleSheet, View } from 'react-native';
import { colors, controls, radius, spacing } from '../../theme';
import { IconButton } from '../ui/IconButton';

export type CollectionView = 'grid' | 'list';

export interface CollectionViewToggleProps {
  value: CollectionView;
  onChange: (value: CollectionView) => void;
}

export function CollectionViewToggle({ value, onChange }: CollectionViewToggleProps) {
  return (
    <View style={styles.container}>
      <IconButton
        accessibilityLabel="Visualização em grid"
        selected={value === 'grid'}
        onPress={() => onChange('grid')}
        style={[styles.button, value === 'grid' && styles.selected]}
      >
        <Grid3X3 size={controls.iconSize} color={value === 'grid' ? colors.accent : colors.textSecondary} />
      </IconButton>
      <IconButton
        accessibilityLabel="Visualização em lista"
        selected={value === 'list'}
        onPress={() => onChange('list')}
        style={[styles.button, value === 'list' && styles.selected]}
      >
        <List size={controls.iconSize} color={value === 'list' ? colors.accent : colors.textSecondary} />
      </IconButton>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignSelf: 'flex-start', padding: spacing.xs, borderRadius: radius.md, backgroundColor: colors.surfaceElevated },
  button: { borderRadius: radius.md, backgroundColor: colors.surfaceElevated },
  selected: { backgroundColor: colors.surfaceActive },
});
