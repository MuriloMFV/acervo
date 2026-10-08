import { useQuery } from '@tanstack/react-query';
import { useSession } from '../contexts/SessionContext';
import { queryKeys } from '../lib/queryClient';
import { lookupBarcode } from '../services/barcode';
import { isValidBarcode, normalizeBarcode } from '../utils/barcode';

export function useBarcodeLookup(code: string) {
  const { session } = useSession();
  const barcode = normalizeBarcode(code);
  return useQuery({ queryKey: queryKeys.barcode(session?.user.id ?? '', barcode), queryFn: ({ signal }) => lookupBarcode(barcode, signal), enabled: !!session && isValidBarcode(barcode), staleTime: 300_000, gcTime: 600_000, retry: false, refetchOnWindowFocus: false });
}
