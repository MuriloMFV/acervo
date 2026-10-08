import type { BarcodeLookupResult, EditionCandidate, KnownEdition } from '../../types/barcode';
import { validatedBarcode } from '../../utils/barcode.ts';

import type { BarcodeWebCandidate } from '../../types/barcodeWeb';

interface LookupSources {
  lookupWeb?: (code: string, signal?: AbortSignal) => Promise<BarcodeWebCandidate[]>;
  findEdition: (code: string, signal?: AbortSignal) => Promise<KnownEdition | null>;
  lookupProduct: (code: string, signal?: AbortSignal) => Promise<EditionCandidate | null>;
}
export async function resolveBarcode(code: string, sources: LookupSources, signal?: AbortSignal): Promise<BarcodeLookupResult> {
  const barcode = validatedBarcode(code);
  const edition = await sources.findEdition(barcode, signal);
  if (edition) return { source: 'SUPABASE', barcode, edition };
  const candidate = await sources.lookupProduct(barcode, signal);
  const result: BarcodeLookupResult = candidate ? { source: 'UPCITEMDB', barcode, candidate } : { source: 'NOT_FOUND', barcode };
  return sources.lookupWeb ? resolveBarcodeWebFallback(result, sources.lookupWeb, signal) : result;
}

export function canLookupBarcodeWeb(result: BarcodeLookupResult): boolean {
  return result.source === 'NOT_FOUND' || (result.source === 'UPCITEMDB' && !(result.candidate.title?.trim() || result.candidate.rawProductName?.trim()));
}
export async function resolveBarcodeWebFallback(result: BarcodeLookupResult, lookupWeb: NonNullable<LookupSources['lookupWeb']>, signal?: AbortSignal): Promise<BarcodeLookupResult> {
  if (!canLookupBarcodeWeb(result)) return result;
  const candidates = await lookupWeb(result.barcode, signal);
  return candidates.length ? { source: 'WEB', barcode: result.barcode, candidates } : { source: 'NOT_FOUND', barcode: result.barcode };
}
