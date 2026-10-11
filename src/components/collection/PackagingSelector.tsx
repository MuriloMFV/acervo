import { StyleSheet, View } from 'react-native';
import { AppText, Chip } from '../ui';
import { packagingLabels } from '../../utils/collectionDetails';
import type { PackagingType } from '../../services/supabase/types';
import { spacing } from '../../theme';

export function PackagingSelector({ value, onChange, disabled = false }: {
  value: PackagingType; onChange: (value: PackagingType) => void; disabled?: boolean;
}) {
  return <View style={styles.field}>
    <AppText variant="label">Tipo de capa</AppText>
    <View style={styles.choices}>{(Object.keys(packagingLabels) as PackagingType[]).map(type => <Chip key={type} label={packagingLabels[type]} selected={value === type} disabled={disabled} onPress={() => onChange(type)} />)}</View>
  </View>;
}
const styles = StyleSheet.create({ field: { gap: spacing.sm }, choices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm } });
