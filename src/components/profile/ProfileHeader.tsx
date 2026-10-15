import { Pressable, StyleSheet, View } from 'react-native';
import { ProfileAvatar } from './ProfileAvatar';
import { AssetIcon } from '../visual/AssetIcon';
import UserRound from 'lucide-react-native/icons/user-round';
import Search from 'lucide-react-native/icons/search';
import Camera from 'lucide-react-native/icons/camera';
import { AppText, IconButton } from '../ui';
import { colors, controls, radius, spacing } from '../../theme';
import type { ProfileRow } from '../../services/supabase/types';

export function ProfileHeader({ profile, displayName, photoUrl, photoBusy = false, photoLoading = false, onPhotoPress, onCollectionPress, onAccountPress }: {
  profile: ProfileRow | null; displayName: string; photoUrl: string | null; photoBusy?: boolean; photoLoading?: boolean; onPhotoPress: () => void; onCollectionPress: () => void; onAccountPress: () => void;
}) {
  const photoLabel = profile?.avatar_url ? 'Alterar foto' : 'Adicionar foto';
  return <View style={styles.section}>
    <View style={styles.brandRow}>
      <View style={styles.brandIcon}><AssetIcon name="dvd-case" size={28} /></View>
      <View style={styles.title}><AppText variant="heading">Acervo</AppText></View>
      <IconButton accessibilityLabel="Buscar na coleção" onPress={onCollectionPress}><Search size={controls.iconSize} color={colors.textSecondary} /></IconButton>
      <IconButton accessibilityLabel="Conta" selected onPress={onAccountPress}><UserRound size={controls.iconSize} color={colors.onPrimary} /></IconButton>
    </View>
    <View style={styles.identity}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${photoLabel} de perfil`} accessibilityState={{ disabled: !profile || photoBusy, busy: photoBusy }} disabled={!profile || photoBusy} onPress={onPhotoPress} style={({ pressed }) => [styles.avatarButton, pressed && styles.pressed]}>
        <ProfileAvatar key={photoUrl} url={photoUrl} busy={photoBusy || photoLoading} />
        <View style={styles.avatarBadge}><Camera size={controls.iconSize - spacing.sm} color={colors.onPrimary} accessible={false} /></View>
      </Pressable>
      <View style={styles.title}>
        <AppText variant="title">{displayName}</AppText>
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: !profile || photoBusy, busy: photoBusy }} disabled={!profile || photoBusy} onPress={onPhotoPress} style={({ pressed }) => [styles.photoAction, pressed && styles.pressed]}><AppText variant="label" color="accent">{photoBusy ? 'Salvando foto…' : photoLabel}</AppText></Pressable>
      </View>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  section: { gap: spacing.md }, brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, title: { flex: 1, gap: spacing.sm },
  brandIcon: { width: controls.minTouchSize, height: controls.minTouchSize, borderRadius: radius.md, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  avatarButton: { width: controls.minTouchSize + spacing.xl, height: controls.minTouchSize + spacing.xl },
  avatarBadge: { position: 'absolute', bottom: 0, right: 0, padding: spacing.xs, borderRadius: radius.full, backgroundColor: colors.primary },
  photoAction: { minHeight: controls.minTouchSize, justifyContent: 'center', alignSelf: 'flex-start' },
  pressed: { opacity: controls.pressedOpacity },
});
