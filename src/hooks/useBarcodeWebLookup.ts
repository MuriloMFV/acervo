import { useQuery } from '@tanstack/react-query';
import { useSession } from '../contexts/SessionContext';
import { queryKeys } from '../lib/queryClient';
import { lookupBarcodeWeb } from '../services/barcode/web';
import { canLookupBarcodeWeb, resolveBarcodeWebFallback } from '../services/barcode/lookup';
import type { BarcodeLookupResult } from '../types/barcode';

export function useBarcodeWebLookup(result: BarcodeLookupResult | undefined, requested: boolean) {
  const { session } = useSession();
  return useQuery({
    queryKey: queryKeys.barcodeWeb(session?.user.id ?? '',result?.barcode ?? ''),
    queryFn: ({signal}) => resolveBarcodeWebFallback(result!,lookupBarcodeWeb,signal),
    enabled: !!session && !!result && canLookupBarcodeWeb(result) && requested,
    staleTime:600_000, gcTime:900_000, retry:false, refetchOnWindowFocus:false, refetchOnReconnect:false, refetchOnMount:false,
  });
}
