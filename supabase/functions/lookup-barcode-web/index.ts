import { authenticate, failure, json, preflight, requestBody } from '../_shared/http.ts';
import { searchSerpApi, SerpApiError } from '../_shared/serpapi.ts';
import { validatedBarcode } from '../../../src/utils/barcode.ts';
import { lookupBarcodeWebCandidates } from '../_shared/barcodeWeb.ts';
Deno.serve(async req => {
  const early = preflight(req); if (early) return early;
  try {
    await authenticate(req);
    const body = await requestBody(req);
    if (typeof body.barcode !== 'string' || body.barcode.length > 32) return json({ error:'Código inválido' },400);
    const barcode = validatedBarcode(body.barcode);
    const key = Deno.env.get('SERPAPI_API_KEY');
    if (!key) return json({ error:'Busca web ainda não configurada' },503);
    const candidates = await lookupBarcodeWebCandidates(barcode, (engine,query) => searchSerpApi(engine,query,key));
    return json({barcode,candidates});
  } catch (error) {
    if (error instanceof SerpApiError) return json({error:error.message,code:error.kind},error.status);
    console.info(JSON.stringify({stage:'barcode-lookup',kind:error instanceof Error && error.message === 'UNAUTHORIZED' ? 'auth' : 'invalid-response-or-input'}));
    return failure(error);
  }
});
