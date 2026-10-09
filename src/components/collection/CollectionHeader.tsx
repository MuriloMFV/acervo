import { AssetIcon } from '../visual/AssetIcon';
import Bell from 'lucide-react-native/icons/bell';
import UserRound from 'lucide-react-native/icons/user-round';
import { StyleSheet, View } from 'react-native';
import { AppText } from '../ui';
import { colors, controls, radius, spacing } from '../../theme';

export function CollectionBrandHeader() {
  return (
    <View style={styles.brandRow}>
      <View style={styles.brandIcon}><AssetIcon name="dvd-case" size={controls.iconSize + spacing.sm + spacing.xs} /></View>
      <AppText variant="heading" style={styles.brand}>Acervo</AppText>
      <Bell size={controls.iconSize} color={colors.textSecondary} />
      <View style={styles.avatar}><UserRound size={controls.iconSize} color={colors.textSecondary} /></View>
    </View>
  );
}

export function CollectionHeader({ count }: { count: number }) {
  return (
    <View style={styles.titleRow}>
      <AppText variant="heading" style={styles.title}>Minha coleção</AppText>
      <AppText variant="caption" color="textMuted">{count} {count === 1 ? 'item' : 'itens'}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.page, paddingVertical: spacing.xs },
  brandIcon: { width: controls.iconSize + spacing.md, height: controls.iconSize + spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  brand: { flex: 1 },
  avatar: { width: controls.iconSize + spacing.sm + spacing.xs, height: controls.iconSize + spacing.sm + spacing.xs, borderRadius: radius.full, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flex: 1 },
});
