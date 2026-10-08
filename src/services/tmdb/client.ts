import { tmdbConfig } from './config.ts';

export class TmdbError extends Error {
  readonly kind: 'configuration' | 'http' | 'network' | 'response';
  readonly status?: number;

  constructor(kind: TmdbError['kind'], status?: number) {
    super('Não foi possível consultar o TMDB.');
    this.name = 'TmdbError';
    this.kind = kind;
    this.status = status;
  }
}

export async function tmdbGet<T>(path: string, params: Record<string, string>, signal?: AbortSignal): Promise<T> {
  const token = process.env.EXPO_PUBLIC_TMDB_READ_TOKEN?.trim();
  if (!token) throw new TmdbError('configuration');
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  else signal?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(abort, 15000);
  try {
    const query = new URLSearchParams({ ...params, language: tmdbConfig.language });
    const response = await fetch(`${tmdbConfig.apiBaseUrl}${path}?${query}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!response.ok) throw new TmdbError('http', response.status);
    try {
      return await response.json() as T;
    } catch {
      throw new TmdbError('response');
    }
  } catch (error: unknown) {
    if (error instanceof TmdbError) throw error;
    // Never expose response bodies, headers or tokens through errors.
    throw new TmdbError('network');
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}
