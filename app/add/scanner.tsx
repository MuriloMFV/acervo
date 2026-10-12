import { useRouter } from 'expo-router';
import { BarcodeScanner } from '../../src/components/barcode/BarcodeScanner';

export default function ScannerScreen() {
  const router = useRouter();
  return <BarcodeScanner
    onScan={code => router.push({ pathname: '/add/barcode', params: { code } })}
    onClose={() => router.canGoBack() ? router.back() : router.replace('/add')}
    onManual={() => router.push('/add/barcode')}
    scannedLabel="Buscando edição..."
  />;
}
