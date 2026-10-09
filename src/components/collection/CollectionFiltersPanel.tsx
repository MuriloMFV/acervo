import { useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import X from 'lucide-react-native/icons/x';
import Check from 'lucide-react-native/icons/check';
import Clock from 'lucide-react-native/icons/clock';
import CalendarDays from 'lucide-react-native/icons/calendar-days';
import ArrowUpDown from 'lucide-react-native/icons/arrow-up-down';
import Banknote from 'lucide-react-native/icons/banknote';
import { AppText, Chip, IconButton, Screen } from '../ui';
import { AssetIcon, MediaFormatIcon } from '../visual/AssetIcon';
import { ActionButton } from '../ui/ActionButton';
import { mediaFormatLabels } from '../movie/MediaFormatBadge';
import { colors, controls, radius, spacing } from '../../theme';
import type { CollectionFilters, CollectionSort, EditionFilter } from '../../types/collectionFilters';
import type { ItemCondition, MediaFormat } from '../../services/supabase/types';
import { conditionLabels } from '../../utils/collectionDetails';
import { collectionSortOptions, defaultCollectionFilters, editionFilterLabels, toggleFilterValue } from '../../utils/collectionFilters';

interface Props {
  filters: CollectionFilters;
  options: { genres: string[]; regions: string[]; decades: number[] };
  onApply: (filters: CollectionFilters) => void;
  onClear: () => void;
  onClose: () => void;
}
function Section({ title, children }: { title: string; children: ReactNode }) {
  return <View style={styles.section}><AppText variant="label" color="textSecondary">{title.toLocaleUpperCase('pt-BR')}</AppText>{children}</View>;
}
function SortIcon({ sort, selected }: { sort: CollectionSort; selected: boolean }) {
  const Icon = sort.startsWith('TITLE') ? ArrowUpDown : sort.startsWith('YEAR') ? CalendarDays : sort.startsWith('PRICE') ? Banknote : Clock;
  return <Icon size={controls.iconSize} color={selected ? colors.accent : colors.textMuted} />;
}
function Choices<T extends string | number>({ values, selected, label, onChange, icon, iconOnly = false }: {
  iconOnly?: boolean; icon?: (value: T) => ReactNode; values: readonly T[]; selected: readonly T[]; label: (value: T) => string; onChange: (values: T[]) => void;
}) {
  return <View style={styles.choices}>
    <Chip label="Todos" selected={!selected.length} onPress={() => onChange([])} />
    {values.map((value) => <Chip hideLabel={iconOnly} icon={icon?.(value)} key={value} label={label(value)} selected={selected.includes(value)} onPress={() => onChange(toggleFilterValue(selected, value))} />)}
  </View>;
}
export function CollectionFiltersPanel({ filters, options, onApply, onClear, onClose }: Props) {
  const [draft, setDraft] = useState(filters);
  function update<K extends keyof CollectionFilters>(key: K, value: CollectionFilters[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }
  return <Modal visible animationType="slide" onRequestClose={onClose}>
    <Screen>
      <View style={styles.header}>
        <IconButton accessibilityLabel="Fechar filtros" onPress={onClose}><X size={controls.iconSize} color={colors.text} /></IconButton>
        <AppText variant="heading" style={styles.title}>Filtros e ordenação</AppText>
        <Pressable accessibilityRole="button" onPress={() => { setDraft(defaultCollectionFilters()); onClear(); }} style={styles.clear}><AppText variant="label" color="accent">LIMPAR</AppText></Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Section title="Ordenar por">
          {collectionSortOptions.map((option) => <Pressable key={option.value} accessibilityRole="radio" accessibilityState={{ checked: draft.sort === option.value }} onPress={() => update('sort', option.value)} style={({ pressed }) => [styles.sort, draft.sort === option.value && styles.selectedSort, pressed && styles.pressed]}>
            <SortIcon sort={option.value} selected={draft.sort === option.value} />
            <AppText variant="label" color={draft.sort === option.value ? 'accent' : 'text'} style={styles.title}>{option.label}</AppText>
            <View style={[styles.radio, draft.sort === option.value && styles.selectedRadio]}>{draft.sort === option.value && <Check size={spacing.md} color={colors.onPrimary} />}</View>
          </Pressable>)}
        </Section>
        <Section title="Formato"><Choices iconOnly values={Object.keys(mediaFormatLabels) as MediaFormat[]} selected={draft.formats} icon={(value) => <MediaFormatIcon format={value} color={draft.formats.includes(value) ? colors.onPrimary : colors.textSecondary} />} label={(v) => mediaFormatLabels[v]} onChange={(v) => update('formats', v)} /></Section>
        <Section title="Tipo de edição"><Choices values={Object.keys(editionFilterLabels) as EditionFilter[]} selected={draft.editions} icon={(value) => value === 'SPECIAL' || value === 'LIMITED' ? <AssetIcon name="limited-edition" color={draft.editions.includes(value) ? colors.onPrimary : colors.textSecondary} /> : null} label={(v) => editionFilterLabels[v]} onChange={(v) => update('editions', v)} /></Section>
        {options.genres.length > 0 && <Section title="Gênero"><Choices values={options.genres} selected={draft.genres} label={(v) => v} onChange={(v) => update('genres', v)} /></Section>}
        <Section title="Década"><Choices values={options.decades} selected={draft.decades} label={(v) => `${v}s`} onChange={(v) => update('decades', v)} /></Section>
        <Section title="Condição"><Choices values={Object.keys(conditionLabels) as ItemCondition[]} selected={draft.conditions} label={(v) => conditionLabels[v]} onChange={(v) => update('conditions', v)} /></Section>
        <Section title="Região / codificação">{options.regions.length ? <Choices values={options.regions} selected={draft.regions} label={(v) => v} onChange={(v) => update('regions', v)} /> : <AppText color="textMuted">—</AppText>}</Section>
        <View style={styles.switches}>
          <View style={styles.switchRow}><AppText variant="label" style={styles.title}>Apenas favoritos</AppText><Switch accessibilityLabel="Apenas favoritos" value={draft.favoritesOnly} onValueChange={(v) => update('favoritesOnly', v)} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.text} /></View>
          <View style={styles.switchRow}><AppText variant="label" style={styles.title}>Apenas edições especiais / limitadas</AppText><Switch accessibilityLabel="Apenas edições especiais ou limitadas" value={draft.specialOnly} onValueChange={(v) => update('specialOnly', v)} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.text} /></View>
        </View>
      </ScrollView>
      <View style={styles.footer}><ActionButton label="Aplicar filtros" onPress={() => onApply(draft)} /></View>
    </Screen>
  </Modal>;
}
const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  title: { flex: 1 }, clear: { minHeight: controls.minTouchSize, justifyContent: 'center' },
  content: { gap: spacing.xl, paddingVertical: spacing.md }, section: { gap: spacing.md },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  sort: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: controls.minTouchSize, padding: spacing.md, backgroundColor: colors.surfaceElevated, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border },
  selectedSort: { borderColor: colors.primary, backgroundColor: colors.accentSurface },
  radio: { width: controls.iconSize, height: controls.iconSize, borderRadius: radius.full, borderWidth: 1, borderColor: colors.textMuted, alignItems: 'center', justifyContent: 'center' },
  selectedRadio: { borderColor: colors.primary, backgroundColor: colors.primary },
  switches: { padding: spacing.md, gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg },
  switchRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', minHeight: controls.minTouchSize },
  footer: { paddingVertical: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  pressed: { opacity: controls.pressedOpacity },
});
