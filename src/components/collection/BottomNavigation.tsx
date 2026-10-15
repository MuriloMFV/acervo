import { TouchSurface as Pressable } from '../ui/TouchSurface';
import { StyleSheet, View } from 'react-native';
import { AssetIcon } from '../visual/AssetIcon';
import Plus from 'lucide-react-native/icons/plus';
import UserRound from 'lucide-react-native/icons/user-round';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '../ui';
import { colors, controls, radius, spacing } from '../../theme';

export interface BottomNavigationProps {
  count: number;
  active?: 'collection' | 'profile';
  onCollectionPress: () => void;
  onAddPress: () => void;
  onProfilePress: () => void;
}

export function BottomNavigation({ count, active = 'collection', onCollectionPress, onAddPress, onProfilePress }: BottomNavigationProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Coleção, ${count} itens`} accessibilityState={{ selected: active === 'collection' }} onPress={onCollectionPress} style={({ pressed }) => [styles.tab, active === 'collection' && styles.activeTab, pressed && styles.pressed]}>
        <View>
          <AssetIcon name="archive" size={controls.iconSize} color={active === 'collection' ? colors.accent : colors.textSecondary} />
        </View>
        <AppText variant="caption" color={active === 'collection' ? 'accent' : 'textSecondary'}>Coleção</AppText>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Adicionar ao Acervo" onPress={onAddPress} style={({ pressed }) => [styles.add, pressed && styles.pressed]}>
        <Plus size={controls.iconSize + spacing.sm} color={colors.onPrimary} />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityState={{ selected: active === 'profile' }} onPress={onProfilePress} style={({ pressed }) => [styles.tab, active === 'profile' && styles.activeTab, pressed && styles.pressed]}>
        <UserRound size={controls.iconSize} color={active === 'profile' ? colors.accent : colors.textSecondary} />
        <AppText variant="caption" color={active === 'profile' ? 'accent' : 'textSecondary'}>Perfil</AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: spacing.page, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, backgroundColor: colors.surface },
  tab: { flex: 1, minHeight: controls.minTouchSize, alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.sm, borderTopWidth: 2, borderTopColor: 'transparent' },
  add: { width: controls.minTouchSize + spacing.md, height: controls.minTouchSize + spacing.md, borderRadius: radius.lg, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginHorizontal: spacing.lg },
  activeTab: { borderTopColor: colors.accent },
  pressed: { opacity: controls.pressedOpacity },
});
