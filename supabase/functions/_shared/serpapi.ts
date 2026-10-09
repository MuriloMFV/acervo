import { readLimited } from './covers.ts';

export const SERPAPI_TIMEOUT_MS = 45_000;
export class SerpApiError extends Error {
  readonly kind: 'timeout' | 'rate-limit' | 'upstream' | 'response';
  readonly status: number;
  constructor(kind: SerpApiError['kind'], status: number) {
    super(kind === 'timeout' ? 'A busca demorou demais. Tente novamente.' : kind === 'rate-limit' ? 'Limite de buscas atingido. Tente mais tarde.' : 'Busca indisponível. Tente novamente.');
    this.kind = kind; this.status = status;
  }
}
export function isEmptyGoogleResult(body: unknown): boolean {
  return !!body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
    && /^Google (?:hasn't|has not) returned any results for this query\.?$/i.test(body.error.trim());
}
// One request, no automatic retry. Never log URL/key/provider error text.
export async function searchSerpApi(engine: 'google' | 'google_images', query: string, key: string, fetcher: typeof fetch = fetch): Promise<unknown> {
  const url = new URL('https://serpapi.com/search');
  url.search = new URLSearchParams({ engine, q: query, hl: 'pt', gl: 'br', api_key: key }).toString();
  const signal = AbortSignal.timeout(SERPAPI_TIMEOUT_MS);
  const start = Date.now();
  try {
    const response = await fetcher(url, { signal, redirect: 'error' });
    if (!response.ok) {
      await response.body?.cancel();
      throw new SerpApiError(response.status === 429 ? 'rate-limit' : 'upstream', response.status === 429 ? 429 : 502);
    }
    const bytes = await readLimited(response, 2 * 1024 * 1024);
    let data: unknown;
    try { data = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new SerpApiError('response', 502); }
    if (!data || typeof data !== 'object') throw new SerpApiError('response', 502);
    if ('error' in data && data.error && !isEmptyGoogleResult(data)) throw new SerpApiError('upstream', 502);
    console.info(JSON.stringify({ stage: 'serpapi', engine, status: response.status, durationMs: Date.now() - start }));
    return data;
  } catch (error) {
    const safe = signal.aborted || (error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name))
      ? new SerpApiError('timeout', 504) : error instanceof SerpApiError ? error : new SerpApiError('upstream', 502);
    console.info(JSON.stringify({ stage: 'serpapi', engine, kind: safe.kind, status: safe.status, durationMs: Date.now() - start }));
    throw safe;
  }
}
