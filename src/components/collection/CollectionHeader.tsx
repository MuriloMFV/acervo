import LibraryBig from 'lucide-react-native/icons/library-big';
import Bell from 'lucide-react-native/icons/bell';
import UserRound from 'lucide-react-native/icons/user-round';
import { StyleSheet, View } from 'react-native';
import { AppText } from '../ui';
import { colors, controls, radius, spacing } from '../../theme';

export function CollectionBrandHeader() {
  return (
    <View style={styles.brandRow}>
      <View style={styles.brandIcon}><LibraryBig size={controls.iconSize} color={colors.accent} /></View>
      <AppText variant="heading" style={styles.brand}>Acervo</AppText>
      <Bell size={controls.iconSize} color={colors.textSecondary} />
      <View style={styles.avatar}><UserRound size={controls.iconSize} color={colors.textSecondary} /></View>
    </View>
  );
}

export function CollectionHeader({ count }: { count: number }) {
  return (
    <View style={styles.titleRow}>
      <AppText variant="title" style={styles.title}>Minha coleção</AppText>
      <View style={styles.counter}>
        <AppText variant="caption" color="textSecondary">{count} {count === 1 ? 'item' : 'itens'}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.page, paddingVertical: spacing.sm },
  brandIcon: { minWidth: controls.minTouchSize, minHeight: controls.minTouchSize, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  brand: { flex: 1 },
  avatar: { width: controls.minTouchSize, height: controls.minTouchSize, borderRadius: radius.full, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flex: 1 },
  counter: { backgroundColor: colors.surfaceActive, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
});
