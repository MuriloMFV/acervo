import { Pressable, StyleSheet, View } from 'react-native';
import LibraryBig from 'lucide-react-native/icons/library-big';
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
      <Pressable accessibilityRole="button" accessibilityState={{ selected: active === 'collection' }} onPress={onCollectionPress} style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>
        <View>
          <LibraryBig size={controls.iconSize} color={active === 'collection' ? colors.accent : colors.textSecondary} />
          <View style={styles.count}><AppText variant="mediaBadge" color="accent">{count}</AppText></View>
        </View>
        <AppText variant="label" color={active === 'collection' ? 'accent' : 'textSecondary'}>Coleção</AppText>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="Adicionar ao Acervo" onPress={onAddPress} style={({ pressed }) => [styles.add, pressed && styles.pressed]}>
        <Plus size={controls.iconSize + spacing.sm} color={colors.onPrimary} />
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityState={{ selected: active === 'profile' }} onPress={onProfilePress} style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>
        <UserRound size={controls.iconSize} color={active === 'profile' ? colors.accent : colors.textSecondary} />
        <AppText variant="label" color={active === 'profile' ? 'accent' : 'textSecondary'}>Perfil</AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, backgroundColor: colors.background },
  tab: { flex: 1, minHeight: controls.minTouchSize, alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.sm },
  add: { width: controls.minTouchSize + spacing.md, height: controls.minTouchSize + spacing.md, borderRadius: radius.full, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginHorizontal: spacing.lg, transform: [{ translateY: -spacing.sm }] },
  count: { position: 'absolute', top: -spacing.sm, left: spacing.md, backgroundColor: colors.surfaceActive, borderRadius: radius.full, paddingHorizontal: spacing.xs },
  pressed: { opacity: controls.pressedOpacity },
});
