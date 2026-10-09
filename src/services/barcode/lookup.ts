import type { BarcodeLookupResult, EditionCandidate, KnownEdition } from '../../types/barcode';
import { BarcodeWebError } from './webErrors.ts';
import { validatedBarcode } from '../../utils/barcode.ts';

import type { BarcodeWebCandidate } from '../../types/barcodeWeb';

interface LookupSources {
  lookupWeb?: (code: string, signal?: AbortSignal) => Promise<BarcodeWebCandidate[]>;
  findEdition: (code: string, signal?: AbortSignal) => Promise<KnownEdition | null>;
  lookupProduct: (code: string, signal?: AbortSignal) => Promise<EditionCandidate | null>;
}
export async function resolveBarcode(code: string, sources: LookupSources, signal?: AbortSignal): Promise<BarcodeLookupResult> {
  const barcode = validatedBarcode(code);
  console.info('[barcode] Supabase lookup start');
  const edition = await sources.findEdition(barcode, signal);
  if (edition) console.info('[barcode] Supabase hit');
  if (edition) return { source: 'SUPABASE', barcode, edition };
  console.info('[barcode] Supabase miss');
  console.info('[barcode] UPCitemdb lookup start');
  const candidate = await sources.lookupProduct(barcode, signal);
  console.info(candidate && (candidate.title?.trim() || candidate.rawProductName?.trim()) ? '[barcode] UPCitemdb hit' : '[barcode] UPCitemdb miss');
  const result: BarcodeLookupResult = candidate ? { source: 'UPCITEMDB', barcode, candidate } : { source: 'NOT_FOUND', barcode };
  return sources.lookupWeb ? resolveBarcodeWebFallback(result, sources.lookupWeb, signal) : result;
}

export function canLookupBarcodeWeb(result: BarcodeLookupResult): boolean {
  return result.source === 'NOT_FOUND' || (result.source === 'UPCITEMDB' && !(result.candidate.title?.trim() || result.candidate.rawProductName?.trim()));
}
export async function resolveBarcodeWebFallback(result: BarcodeLookupResult, lookupWeb: NonNullable<LookupSources['lookupWeb']>, signal?: AbortSignal): Promise<BarcodeLookupResult> {
  if (!canLookupBarcodeWeb(result)) return result;
  console.info('[barcode] SerpApi fallback start');
  let candidates: BarcodeWebCandidate[];
  try { candidates = await lookupWeb(result.barcode, signal); }
  catch (error) {
    if (signal?.aborted || (error instanceof Error && error.name === 'AbortError')) throw error;
    const webFailure = error instanceof BarcodeWebError ? error.kind : 'unavailable';
    console.info(`[barcode] SerpApi fallback unavailable: ${webFailure}`);
    return { source: 'NOT_FOUND', barcode: result.barcode, webUnavailable: true, webFailure };
  }
  console.info(`[barcode] SerpApi candidates: ${candidates.length}`);
  return candidates.length ? { source: 'WEB', barcode: result.barcode, candidates } : { source: 'NOT_FOUND', barcode: result.barcode };
}
