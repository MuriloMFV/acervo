import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import SlidersHorizontal from 'lucide-react-native/icons/sliders-horizontal';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import Check from 'lucide-react-native/icons/check';
import { AppText } from '../ui';
import { CollectionViewToggle, type CollectionView } from '../movie';
import { colors, controls, radius, spacing } from '../../theme';
import { collectionSortOptions } from '../../utils/collectionFilters';
import type { CollectionSort } from '../../types/collectionFilters';

export interface CollectionToolbarProps {
  sort: CollectionSort;
  onSortChange: (value: CollectionSort) => void;
  view: CollectionView;
  onViewChange: (value: CollectionView) => void;
  onFiltersPress: () => void;
  filtersActive?: boolean;
}

export function CollectionToolbar({ sort, onSortChange, view, onViewChange, onFiltersPress, filtersActive = false }: CollectionToolbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const current = collectionSortOptions.find((option) => option.value === sort)!;
  return (
    <>
      <View style={styles.toolbar}>
        <Pressable accessibilityRole="button" accessibilityLabel={filtersActive ? 'Filtros ativos' : 'Filtros'} onPress={onFiltersPress} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
          <SlidersHorizontal size={controls.iconSize} color={filtersActive ? colors.accent : colors.textSecondary} />
          <AppText variant="label" color={filtersActive ? 'accent' : 'text'}>Filtros</AppText>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Ordenar: ${current.label}`} accessibilityState={{ expanded: menuOpen }} onPress={() => setMenuOpen(true)} style={({ pressed }) => [styles.button, styles.sort, pressed && styles.pressed]}>
          <AppText variant="caption" color="textSecondary">{current.shortLabel}</AppText>
          <ChevronDown size={spacing.md} color={colors.textSecondary} />
        </Pressable>
        <CollectionViewToggle value={view} onChange={onViewChange} />
      </View>
      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <View style={styles.modal}>
          <Pressable accessibilityRole="button" accessibilityLabel="Fechar ordenação" onPress={() => setMenuOpen(false)} style={styles.backdrop} />
          <View accessibilityViewIsModal style={styles.menu}>
            <AppText variant="heading">Ordenar por</AppText>
            <ScrollView>{collectionSortOptions.map((option) => (
              <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ checked: sort === option.value }} onPress={() => { onSortChange(option.value); setMenuOpen(false); }} style={({ pressed }) => [styles.option, pressed && styles.pressed]}>
                <AppText variant="label" color={sort === option.value ? 'accent' : 'text'} style={styles.optionLabel}>{option.label}</AppText>
                {sort === option.value && <Check size={controls.iconSize} color={colors.accent} />}
              </Pressable>
            ))}</ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs },
  button: { minHeight: controls.minTouchSize, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingHorizontal: spacing.sm, borderRadius: radius.md, backgroundColor: colors.surfaceElevated },
  sort: { flexGrow: 1 },
  pressed: { opacity: controls.pressedOpacity },
  modal: { flex: 1, justifyContent: 'center', padding: spacing.page },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: colors.background, opacity: 0.9 },
  menu: { maxHeight: '80%', padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surfaceElevated, gap: spacing.sm },
  option: { minHeight: controls.minTouchSize, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  optionLabel: { flex: 1 },
});
