import { useRouter } from 'expo-router';
import { AddMethodSheet } from '../../src/components/add/AddMethodSheet';

// Full manual Movie registration remains reserved for its own task.
const handlePendingAction = () => {};

export default function AddScreen() {
  const router = useRouter();
  const close = () => router.canGoBack() ? router.back() : router.replace('/');
  return <AddMethodSheet onClose={close} onSearch={() => router.navigate('/add/search')} onScan={() => router.navigate('/add/scanner')} onManual={handlePendingAction} />;
}
