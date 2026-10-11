import { StyleSheet, Text, View } from 'react-native';
import { AppText } from './AppText';
import { countryFlag, countryName, findCountry } from '../../utils/countries';

export function CountryDisplay({ value }: { value: string | null | undefined }) {
  const country = findCountry(value);
  return <View style={styles.row} accessible={!!country} accessibilityRole={country ? 'image' : undefined} accessibilityLabel={country ? `País: ${countryName(value)}` : undefined}>
    {country ? <Text accessible={false} style={styles.flag}>{countryFlag(country.code)}</Text>
      : <AppText variant="label" style={styles.name}>{countryName(value) || '—'}</AppText>}
  </View>;
}
const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center' }, flag: { fontSize: 24 }, name: { flexShrink: 1 } });
