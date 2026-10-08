import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScanBarcode from 'lucide-react-native/icons/scan-barcode';
import Search from 'lucide-react-native/icons/search';
import FilePen from 'lucide-react-native/icons/file-pen';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import X from 'lucide-react-native/icons/x';
import { AppText, IconButton } from '../ui';
import { colors, controls, radius, spacing } from '../../theme';

interface AddMethodSheetProps {
  onClose: () => void;
  onSearch: () => void;
  onScan: () => void;
  onManual: () => void;
}

function AddMethodOption({ label, icon, highlighted = false, onPress }: {
  label: string; icon: ReactNode; highlighted?: boolean; onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.option, highlighted && styles.highlighted, pressed && styles.pressed]}>
      <View style={[styles.icon, highlighted && styles.highlightedIcon]}>{icon}</View>
      <AppText variant="addOptionLabel" style={styles.optionLabel}>{label}</AppText>
      <ChevronRight size={controls.iconSize} color={colors.textMuted} />
    </Pressable>
  );
}

export function AddMethodSheet({ onClose, onSearch, onScan, onManual }: AddMethodSheetProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.overlay} accessibilityViewIsModal onAccessibilityEscape={onClose}>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.scrim]} />
      <Pressable accessibilityRole="button" accessibilityLabel="Fechar Adicionar ao Acervo" onPress={onClose} style={StyleSheet.absoluteFill} />
      <View style={[styles.sheet, { maxHeight: '90%', marginTop: insets.top }]}>
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <AppText variant="heading" style={styles.heading}>Adicionar ao Acervo</AppText>
            <IconButton accessibilityLabel="Fechar" onPress={onClose}><X size={controls.iconSize} color={colors.textMuted} /></IconButton>
          </View>
          <AddMethodOption label="Escanear código de barras" highlighted icon={<ScanBarcode size={controls.iconSize} color={colors.accent} />} onPress={onScan} />
          <AddMethodOption label="Buscar filme" icon={<Search size={controls.iconSize} color={colors.textSecondary} />} onPress={onSearch} />
          <AddMethodOption label="Cadastro manual" icon={<FilePen size={controls.iconSize} color={colors.textSecondary} />} onPress={onManual} />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  scrim: { backgroundColor: colors.background, opacity: 0.8 },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.lg + spacing.sm, borderTopRightRadius: radius.lg + spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  content: { paddingHorizontal: spacing.page, paddingTop: spacing.sm, gap: spacing.sm },
  handle: { width: spacing.xl + spacing.sm, height: spacing.xs, alignSelf: 'center', borderRadius: radius.full, backgroundColor: colors.textMuted, opacity: 0.4, marginBottom: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  heading: { flex: 1 },
  option: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, backgroundColor: colors.surfaceElevated, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.surfaceElevated },
  highlighted: { borderColor: colors.accentSurface },
  icon: { width: controls.minTouchSize, height: controls.minTouchSize, borderRadius: radius.md, backgroundColor: colors.surfaceActive, alignItems: 'center', justifyContent: 'center' },
  highlightedIcon: { backgroundColor: colors.accentSurface },
  optionLabel: { flex: 1 },
  pressed: { opacity: controls.pressedOpacity },
});
