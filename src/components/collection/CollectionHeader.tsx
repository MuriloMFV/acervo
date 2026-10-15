import { AssetIcon } from '../visual/AssetIcon';
import { ProfileAvatar } from '../profile/ProfileAvatar';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '../ui';
import { colors, controls, spacing } from '../../theme';

export function CollectionBrandHeader({ photoUrl = null, photoLoading = false, onProfilePress }: {
  photoUrl?: string | null; photoLoading?: boolean; onProfilePress?: () => void;
}) {
  return <View style={styles.brandRow}>
    <AssetIcon name="dvd-case" size={28} color={colors.accent} />
    <AppText variant="heading" style={styles.brand}>Acervo</AppText>
    <Pressable accessibilityRole="button" accessibilityLabel="Abrir perfil" disabled={!onProfilePress} onPress={onProfilePress} style={({ pressed }) => [styles.avatarButton, pressed && styles.pressed]}>
      <ProfileAvatar key={photoUrl} url={photoUrl} busy={photoLoading} size={32} />
    </Pressable>
  </View>;
}

export function CollectionHeader({ count }: { count: number }) {
  return <View style={styles.titleRow}>
    <AppText variant="title" style={styles.title}>Minha coleção</AppText>
    <AppText variant="caption" color="textMuted" style={styles.count}>{count.toLocaleString('pt-BR')} {count === 1 ? 'item' : 'itens'}</AppText>
  </View>;
}

const styles = StyleSheet.create({
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.page, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  brand: { flex: 1, fontSize: 24, letterSpacing: -0.8 },
  avatarButton: { minWidth: controls.minTouchSize, minHeight: controls.minTouchSize, alignItems: 'center', justifyContent: 'center' },
  titleRow: { gap: spacing.xs, paddingBottom: spacing.xs },
  title: { flexShrink: 1 },
  count: { fontVariant: ['tabular-nums'] },
  pressed: { opacity: controls.pressedOpacity },
});
