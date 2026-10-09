import { upcLookupUrl } from './config.ts';

export class UpcError extends Error {
  readonly kind: 'configuration' | 'network' | 'http' | 'response' | 'rate-limit';
  readonly status?: number;
  constructor(kind: UpcError['kind'], status?: number) {
    super(kind === 'rate-limit' ? 'Limite de consultas atingido. Tente mais tarde.' : 'Não foi possível consultar agora');
    this.name = 'UpcError';
    this.kind = kind; this.status = status;
  }
}
export async function upcGet(code: string, signal?: AbortSignal): Promise<unknown> {
  let endpoint: string;
  try { endpoint = upcLookupUrl(); } catch { throw new UpcError('configuration'); }
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) abort(); else signal?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(abort, 15_000);
  try {
    const response = await fetch(`${endpoint}?${new URLSearchParams({ upc: code })}`, { headers: { Accept: 'application/json' }, signal: controller.signal });
    if (response.status === 429) throw new UpcError('rate-limit', 429);
    // The app accepts EAN/UPC lengths without enforcing provider checksum rules.
    // A provider-specific rejection can still be searched on the web.
    if (response.status === 400) {
      const body: unknown = await response.json();
      if (body && typeof body === 'object' && 'code' in body && body.code === 'INVALID_UPC') return { code: 'OK', items: [] };
      throw new UpcError('http', 400);
    }
    // Check the documented error code so a wrong route isn't mistaken for no item.
    if (response.status === 404) {
      const body: unknown = await response.json();
      if (body && typeof body === 'object' && 'code' in body && body.code === 'NOT_FOUND') return { code: 'OK', items: [] };
      throw new UpcError('http', 404);
    }
    if (!response.ok) throw new UpcError('http', response.status);
    try { return await response.json(); } catch { throw new UpcError('response'); }
  } catch (error) {
    if (error instanceof UpcError) throw error;
    if (signal?.aborted) { const cancelled = new Error('Consulta cancelada'); cancelled.name = 'AbortError'; throw cancelled; }
    throw new UpcError('network');
  } finally { clearTimeout(timeout); signal?.removeEventListener('abort', abort); }
}
