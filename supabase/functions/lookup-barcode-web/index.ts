import { authenticate, failure, json, preflight, requestBody } from '../_shared/http.ts';
import { readLimited } from '../_shared/covers.ts';
import { validatedBarcode } from '../../../src/utils/barcode.ts';
import { barcodeWebQuery, normalizeBarcodeWebResults } from '../../../src/services/barcode/webParsing.ts';
Deno.serve(async req => {
  const early = preflight(req); if (early) return early;
  try {
    await authenticate(req);
    const body = await requestBody(req);
    if (typeof body.barcode !== 'string' || body.barcode.length > 32) return json({ error:'Código inválido' },400);
    const barcode = validatedBarcode(body.barcode);
    const key = Deno.env.get('SERPAPI_API_KEY');
    if (!key) return json({ error:'Busca web ainda não configurada' },503);
    const url = new URL('https://serpapi.com/search');
    url.search = new URLSearchParams({engine:'google',q:barcodeWebQuery(barcode),hl:'pt',gl:'br',api_key:key}).toString();
    const response = await fetch(url,{redirect:'error',signal:AbortSignal.timeout(15000)});
    if (!response.ok) { await response.body?.cancel(); return json({error:'Busca web indisponível'},response.status === 429 ? 429 : 502); }
    const data = JSON.parse(new TextDecoder().decode(await readLimited(response,2*1024*1024)));
    return json({barcode,candidates:normalizeBarcodeWebResults(data,barcode)});
  } catch(error) { return failure(error); }
});
