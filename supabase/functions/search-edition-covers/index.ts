import { authenticate, failure, json, preflight, requestBody } from '../_shared/http.ts';
import { normalizeCoverResults, signCover, validateQuery } from '../_shared/covers.ts';
import { isEmptyGoogleResult, searchSerpApi, SerpApiError } from '../_shared/serpapi.ts';
Deno.serve(async (req) => {
  const early = preflight(req); if (early) return early;
  try {
    const { userId } = await authenticate(req);
    const body = await requestBody(req);
    const query = validateQuery(body.query);
    const key = Deno.env.get('SERPAPI_API_KEY');
    if (!key) return json({ error: 'Busca de capas ainda não configurada' }, 503);
    const data = await searchSerpApi('google_images', query, key);
    if (isEmptyGoogleResult(data)) return json({ candidates: [] });
    const candidates = await Promise.all(normalizeCoverResults(data).map(async candidate => ({ ...candidate, copyToken: await signCover(candidate.imageUrl, userId, key) })));
    console.info(JSON.stringify({stage:'cover-results',candidates:candidates.length}));
    return json({ candidates });
  } catch (error) {
    if (error instanceof SerpApiError) return json({error:error.message,code:error.kind},error.status);
    console.info(JSON.stringify({stage:'cover-search',kind:error instanceof Error && error.message === 'UNAUTHORIZED' ? 'auth' : 'invalid-response-or-input'}));
    return failure(error);
  }
});
