import { AssetIcon } from '../visual/AssetIcon';
import { ProfileAvatar } from '../profile/ProfileAvatar';
import Bell from 'lucide-react-native/icons/bell';
import { StyleSheet, View } from 'react-native';
import { AppText } from '../ui';
import { colors, controls, radius, spacing } from '../../theme';

export function CollectionBrandHeader({ photoUrl = null, photoLoading = false }: { photoUrl?: string | null; photoLoading?: boolean }) {
  return (
    <View style={styles.brandRow}>
      <View style={styles.brandIcon}><AssetIcon name="dvd-case" size={controls.iconSize + spacing.sm + spacing.xs} /></View>
      <AppText variant="heading" style={styles.brand}>Acervo</AppText>
      <Bell size={controls.iconSize} color={colors.textSecondary} />
      <View accessible accessibilityRole="image" accessibilityLabel="Perfil do usuário">
        <ProfileAvatar key={photoUrl} url={photoUrl} busy={photoLoading} size={controls.iconSize + spacing.sm + spacing.xs} style={styles.avatar} />
      </View>
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
  avatar: { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.accent },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flex: 1 },
});
