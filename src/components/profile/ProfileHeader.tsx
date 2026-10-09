import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { AssetIcon } from '../visual/AssetIcon';
import UserRound from 'lucide-react-native/icons/user-round';
import Search from 'lucide-react-native/icons/search';
import { AppText, IconButton } from '../ui';
import { colors, controls, radius, spacing } from '../../theme';
import type { ProfileRow } from '../../services/supabase/types';

function Avatar({ url }: { url: string | null }) {
  const [failed, setFailed] = useState(false);
  return <View style={styles.avatar}>{url && !failed ? <Image source={{ uri: url }} resizeMethod="resize" style={styles.image} onError={() => setFailed(true)} accessibilityLabel="Foto de perfil" /> : <UserRound size={controls.iconSize + spacing.md} color={colors.textSecondary} />}</View>;
}
export function ProfileHeader({ profile, count, onCollectionPress, onAccountPress }: {
  profile: ProfileRow | null; count: number | null; onCollectionPress: () => void; onAccountPress: () => void;
}) {
  const url = profile?.avatar_url?.trim() || null;
  return <View style={styles.section}>
    <View style={styles.brandRow}>
      <View style={styles.brandIcon}><AssetIcon name="dvd-case" size={controls.iconSize + spacing.sm + spacing.xs} /></View>
      <View style={styles.title}><AppText variant="heading">Acervo</AppText><AppText variant="caption" color="textMuted">PERFIL</AppText></View>
      <IconButton accessibilityLabel="Buscar na coleção" onPress={onCollectionPress}><Search size={controls.iconSize} color={colors.textSecondary} /></IconButton>
      <IconButton accessibilityLabel="Conta" selected onPress={onAccountPress}><UserRound size={controls.iconSize} color={colors.onPrimary} /></IconButton>
    </View>
    <View style={styles.identity}>
      <Avatar key={url} url={url} />
      <View style={styles.title}><AppText variant="heading">{profile?.display_name?.trim() || 'Perfil'}</AppText><View style={styles.counter}><AppText variant="label" color="accent">{count === null ? '—' : `${count} ${count === 1 ? 'item' : 'itens'} no Acervo`}</AppText></View></View>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  section: { gap: spacing.md }, brandRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, title: { flex: 1, gap: spacing.sm },
  brandIcon: { width: controls.minTouchSize, height: controls.minTouchSize, borderRadius: radius.md, backgroundColor: colors.surfaceActive, alignItems: 'center', justifyContent: 'center' },
  identity: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg },
  avatar: { width: controls.minTouchSize + spacing.xl, height: controls.minTouchSize + spacing.xl, borderRadius: radius.full, borderWidth: 1, borderColor: colors.primary, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' }, counter: { alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, backgroundColor: colors.accentSurface, borderRadius: radius.full },
});
