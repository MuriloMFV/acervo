import { StyleSheet, View } from 'react-native';
import { AppText } from './AppText';
import { DistributorLogo } from '../visual/DistributorLogo';
import { distributorName, findDistributor } from '../../utils/distributors';

export function DistributorDisplay({ value }: { value: string | null | undefined }) {
  const distributor = findDistributor(value);
  return <View style={styles.content} accessible={!!distributor} accessibilityRole={distributor ? 'image' : undefined} accessibilityLabel={distributor ? `Distribuidora: ${distributor.name}` : undefined}>
    {distributor ? <DistributorLogo id={distributor.id} />
      : <AppText variant="label" style={styles.name}>{distributorName(value) || '—'}</AppText>}
  </View>;
}

const styles = StyleSheet.create({
  content: { alignItems: 'flex-start', flexShrink: 1, maxWidth: '100%' },
  name: { alignSelf: 'stretch' },
});
