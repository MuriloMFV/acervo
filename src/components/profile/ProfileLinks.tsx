import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Star from 'lucide-react-native/icons/star';
import Award from 'lucide-react-native/icons/award';
import Clock from 'lucide-react-native/icons/clock';
import Heart from 'lucide-react-native/icons/heart';
import UserRound from 'lucide-react-native/icons/user-round';
import Palette from 'lucide-react-native/icons/palette';
import Cloud from 'lucide-react-native/icons/cloud';
import Download from 'lucide-react-native/icons/download';
import Info from 'lucide-react-native/icons/info';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { AppText } from '../ui';
import { colors, controls, radius, spacing } from '../../theme';
import type { CollectionShortcut } from '../../types/collectionFilters';
import type { CollectionStats } from '../../types/collectionStats';

function Row({ label, icon, value, onPress, last = false }: { label: string; icon: ReactNode; value?: string; onPress?: () => void; last?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: !onPress }} disabled={!onPress} onPress={onPress} style={({ pressed }) => [styles.row, !last && styles.border, pressed && styles.pressed]}>
    {icon}<AppText variant="label" style={styles.title}>{label}</AppText>{value && <AppText variant="caption" color="textMuted">{value}</AppText>}{onPress && <ChevronRight size={spacing.md} color={colors.textMuted} />}
  </Pressable>;
}
export function ProfileLinks({ stats, onShortcut, onAccount, onAbout, onExport, onWishlist, exporting = false }: { stats: CollectionStats | null; onShortcut: (value: CollectionShortcut) => void; onAccount: () => void; onAbout: () => void; onExport: () => void; onWishlist: () => void; exporting?: boolean }) {
  const iconProps = { size: controls.iconSize, color: colors.textSecondary };
  const shortcutIcon = { ...iconProps, color: colors.accent };
  return <>
    <View style={styles.section}><AppText variant="heading">Atalhos</AppText><View style={styles.group}>
      <Row label="Favoritos" icon={<Star {...shortcutIcon} />} value={stats ? `${stats.favorites} itens` : undefined} onPress={() => onShortcut('FAVORITES')} />
      <Row label="Lista de desejos" icon={<Heart {...shortcutIcon} />} onPress={onWishlist} />
      <Row label="Edições especiais" icon={<Award {...shortcutIcon} />} value={stats ? `${stats.specialEditions} itens` : undefined} onPress={() => onShortcut('SPECIAL_EDITIONS')} />
      <Row label="Adicionados recentemente" icon={<Clock {...shortcutIcon} />} onPress={() => onShortcut('RECENT')} last />
    </View></View>
    <View style={styles.section}><AppText variant="heading">Configurações</AppText><View style={styles.group}>
      <Row label="Conta" icon={<UserRound {...iconProps} />} onPress={onAccount} />
      <Row label="Aparência" icon={<Palette {...iconProps} />} value="Escuro" />
      <Row label="Backup e sincronização" icon={<Cloud {...iconProps} />} />
      <Row label="Exportar acervo" icon={<Download {...iconProps} />} value={exporting ? 'Gerando PDF…' : undefined} onPress={exporting ? undefined : onExport} />
      <Row label="Sobre o Acervo" icon={<Info {...iconProps} />} onPress={onAbout} last />
    </View></View>
  </>;
}
const styles = StyleSheet.create({
  section: { gap: spacing.md }, group: { paddingHorizontal: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface },
  row: { minHeight: controls.minTouchSize + spacing.md, paddingVertical: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  title: { flex: 1 }, border: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }, pressed: { opacity: controls.pressedOpacity },
});
