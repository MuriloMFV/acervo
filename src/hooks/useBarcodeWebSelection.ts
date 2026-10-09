import { useQuery } from '@tanstack/react-query';
import { useSession } from '../contexts/SessionContext';
import { queryKeys } from '../lib/queryClient';
import type { BarcodeLookupResult } from '../types/barcode';

// Observe the prior explicit search only. Navigation never repeats the web lookup.
export function useBarcodeWebSelection(code: string, candidateId?: string) {
  const { session } = useSession();
  const cached = useQuery<BarcodeLookupResult>({queryKey:queryKeys.barcodeWeb(session?.user.id ?? '',code),enabled:false});
  return cached.data?.source === 'WEB' ? cached.data.candidates.find(candidate => candidate.id === candidateId) : undefined;
}
