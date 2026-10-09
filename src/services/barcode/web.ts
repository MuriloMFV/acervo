import { BarcodeWebError } from './webErrors';
import { getSupabaseClient } from '../supabase/client';
import { validatedBarcode } from '../../utils/barcode';
import type { BarcodeWebCandidate } from '../../types/barcodeWeb';
export async function lookupBarcodeWeb(value: string, signal?: AbortSignal): Promise<BarcodeWebCandidate[]> {
  const barcode = validatedBarcode(value);
  const client = getSupabaseClient();
  const {data:auth,error:authError} = await client.auth.getSession();
  if (authError || !auth.session) throw new BarcodeWebError('auth');
  const {data,error} = await client.functions.invoke('lookup-barcode-web',{body:{barcode},headers:{Authorization:`Bearer ${auth.session.access_token}`},signal});
  if (error) {
    const status = error.context instanceof Response ? error.context.status : undefined;
    throw new BarcodeWebError(status === 504 ? 'timeout' : status === 429 ? 'rate-limit' : status === 401 ? 'auth' : 'unavailable');
  }
  if (data?.barcode !== barcode || !Array.isArray(data.candidates)) throw new BarcodeWebError('unavailable');
  return data.candidates;
}
