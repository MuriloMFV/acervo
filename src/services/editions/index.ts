import { getSupabaseClient } from '../supabase/client';
import type { KnownEdition } from '../../types/barcode';
import { barcodeAliases, validatedBarcode } from '../../utils/barcode';
import { authenticatedUserId } from '../collection';

export async function findEditionByBarcode(code: string, signal?: AbortSignal): Promise<KnownEdition | null> {
  await authenticatedUserId();
  const barcode = validatedBarcode(code);
  let query = getSupabaseClient().from('editions').select('*,movie:movies!inner(*)').in('barcode', barcodeAliases(barcode)).order('created_at').order('id').limit(1);
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data;
}
