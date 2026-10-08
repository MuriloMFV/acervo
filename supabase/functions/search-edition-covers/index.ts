import { authenticate, failure, json, preflight, requestBody } from '../_shared/http.ts';
import { normalizeCoverResults, readLimited, signCover, validateQuery } from '../_shared/covers.ts';
Deno.serve(async (req) => {
  const early = preflight(req); if (early) return early;
  try {
    const { userId } = await authenticate(req);
    const body = await requestBody(req);
    const query = validateQuery(body.query);
    const key = Deno.env.get('SERPAPI_API_KEY');
    if (!key) return json({ error: 'Busca de capas ainda não configurada' }, 503);
    const url = new URL('https://serpapi.com/search');
    url.search = new URLSearchParams({ engine: 'google_images', q: query, hl: 'pt', gl: 'br', api_key: key }).toString();
    const response = await fetch(url, { signal: AbortSignal.timeout(15000), redirect: 'error' });
    if (!response.ok) { await response.body?.cancel(); return json({ error: 'Busca de capas indisponível' }, response.status === 429 ? 429 : 502); }
    const data = JSON.parse(new TextDecoder().decode(await readLimited(response, 2 * 1024 * 1024)));
    const candidates = await Promise.all(normalizeCoverResults(data).map(async candidate => ({ ...candidate, copyToken: await signCover(candidate.imageUrl, userId, key) })));
    return json({ candidates });
  } catch (error) { return failure(error); }
});
