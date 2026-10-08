import { ScrollView, StyleSheet } from 'react-native';
import { Chip } from '../ui';
import { spacing } from '../../theme';
import type { FormatFilter } from '../../utils/collectionPreview';
import type { MediaFormat } from '../../services/supabase/types';

const options: { value: FormatFilter; label: string }[] = [
  { value: 'ALL', label: 'Todos' }, { value: 'DVD', label: 'DVD' },
  { value: 'BLURAY', label: 'Blu-ray' }, { value: 'UHD_4K', label: '4K UHD' },
  { value: 'VHS', label: 'VHS' },
];

export interface FormatFilterBarProps {
  formats: readonly MediaFormat[];
  counts: Record<FormatFilter, number>;
  onChange: (value: FormatFilter) => void;
}

export function FormatFilterBar({ formats, counts, onChange }: FormatFilterBarProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {options.map((option) => (
        <Chip key={option.value} label={`${option.label} ${counts[option.value]}`} selected={option.value === 'ALL' ? !formats.length : formats.includes(option.value)} onPress={() => onChange(option.value)} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({ content: { gap: spacing.sm } });
