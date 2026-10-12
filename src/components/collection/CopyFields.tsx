import { StyleSheet, Switch, View } from 'react-native';
import { AppText } from '../ui';
import { FormField } from '../ui/FormField';
import { PurchaseDateField } from '../ui/PurchaseDateField';
import { ConditionSelector } from './ConditionSelector';
import type { CopyFormValues } from '../../services/collection/types';
import { colors, spacing } from '../../theme';

export function CopyFields({ values, onChange, disabled = false }: {
  values: CopyFormValues; onChange: (changes: Partial<CopyFormValues>) => void; disabled?: boolean;
}) {
  const field = (key: 'price' | 'date' | 'place' | 'notes') => (text: string) => onChange({ [key]: text });
  return <View style={styles.fields}>
    <ConditionSelector value={values.condition} onChange={condition => onChange({ condition })} disabled={disabled} />
    <FormField label="Preço pago" value={values.price} onChangeText={field('price')} keyboardType="decimal-pad" editable={!disabled} />
    <PurchaseDateField value={values.date} onChange={field('date')} disabled={disabled} />
    <FormField label="Local de compra" value={values.place} onChangeText={field('place')} editable={!disabled} />
    <FormField label="Observações" value={values.notes} onChangeText={field('notes')} multiline editable={!disabled} />
    <View style={styles.toggle}>
      <AppText variant="label" style={styles.label}>Favorito</AppText>
      <Switch accessibilityLabel="Favorito" value={!!values.favorite} disabled={disabled} onValueChange={favorite => onChange({ favorite })} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={colors.text} />
    </View>
  </View>;
}

const styles = StyleSheet.create({
  fields: { gap: spacing.md },
  toggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  label: { flex: 1 },
});
