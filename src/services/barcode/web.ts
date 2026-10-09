import { getSupabaseClient } from '../supabase/client';
import { validatedBarcode } from '../../utils/barcode';
import type { BarcodeWebCandidate } from '../../types/barcodeWeb';
export async function lookupBarcodeWeb(value: string, signal?: AbortSignal): Promise<BarcodeWebCandidate[]> {
  const barcode = validatedBarcode(value);
  const client = getSupabaseClient();
  const {data:auth,error:authError} = await client.auth.getSession();
  if (authError || !auth.session) throw new Error('Entre para continuar');
  const {data,error,response} = await client.functions.invoke('lookup-barcode-web',{body:{barcode},headers:{Authorization:`Bearer ${auth.session.access_token}`},signal});
  if (error) {
    let message = 'Não foi possível consultar a web';
    const failedResponse = response ?? error.context;
    if (failedResponse && typeof failedResponse.json === 'function') { try { const body = await failedResponse.json(); if (typeof body.error === 'string') message = body.error; } catch { /* Keep fallback. */ } }
    throw new Error(message);
  }
  if (data?.barcode !== barcode || !Array.isArray(data.candidates)) throw new Error('Resposta inválida');
  return data.candidates;
}
