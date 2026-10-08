import { StyleSheet, View } from 'react-native';
import { AppText, Chip } from '../ui';
import type { ItemCondition } from '../../services/supabase/types';
import { conditionLabels } from '../../utils/collectionDetails';
import { spacing } from '../../theme';

export function ConditionSelector({ value, onChange, disabled = false }: { value: ItemCondition | null; onChange: (value: ItemCondition) => void; disabled?: boolean }) {
  return <View style={styles.field}>
    <AppText variant="label">Condição</AppText>
    <View style={styles.choices}>{(Object.keys(conditionLabels) as ItemCondition[]).map((condition) => <Chip key={condition} label={conditionLabels[condition]} selected={value === condition} disabled={disabled} onPress={() => onChange(condition)} />)}</View>
  </View>;
}
const styles = StyleSheet.create({ field: { gap: spacing.sm }, choices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm } });
