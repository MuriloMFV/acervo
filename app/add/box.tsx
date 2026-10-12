import { useRouter } from 'expo-router';
import { Screen } from '../../src/components/ui';
import { BoxForm } from '../../src/components/boxes/BoxForm';

export default function AddBoxScreen() {
  const router = useRouter();
  return <Screen><BoxForm
    onBack={() => router.canGoBack() ? router.back() : router.replace('/add')}
    onSaved={id => router.dismissTo({ pathname: '/', params: { added: id } })}
  /></Screen>;
}
