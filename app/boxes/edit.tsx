import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { AppText, Screen } from '../../src/components/ui';
import { ActionButton } from '../../src/components/ui/ActionButton';
import { BoxForm } from '../../src/components/boxes/BoxForm';
import { useCollectionBox } from '../../src/hooks/useCollectionBoxes';
import { colors, spacing } from '../../src/theme';

export default function EditBoxScreen() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const itemId = typeof id === 'string' ? id : '';
  const router = useRouter();
  const box = useCollectionBox(itemId);
  const back = () => router.canGoBack() ? router.back() : router.replace({ pathname: '/boxes/[id]', params: { id: itemId } });
  return <Screen>{box.isPending && itemId ? <ActivityIndicator accessibilityLabel="Carregando box" color={colors.accent} />
    : box.data ? <BoxForm key={box.data.id} item={box.data} onSaved={back} onBack={back} />
    : <View style={styles.error}><AppText color="textMuted">{box.isError ? 'Não foi possível carregar o box' : 'Item não encontrado'}</AppText>
      {box.isError && <ActionButton secondary label="Tentar novamente" onPress={() => { void box.refetch(); }} />}
      <ActionButton secondary label="Voltar" onPress={back} />
    </View>}</Screen>;
}
const styles = StyleSheet.create({ error: { gap: spacing.md, paddingVertical: spacing.md } });
