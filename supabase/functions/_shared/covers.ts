export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const COVER_BUCKET = 'edition-covers';
// Fixed CDNs only: no arbitrary host, local address, port or redirect target.
const imageHosts = new Set(['serpapi.com', 'encrypted-tbn0.gstatic.com', 'encrypted-tbn1.gstatic.com', 'encrypted-tbn2.gstatic.com', 'encrypted-tbn3.gstatic.com', 'm.media-amazon.com', 'images-na.ssl-images-amazon.com', 'images-eu.ssl-images-amazon.com', 'upload.wikimedia.org', 'http2.mlstatic.com', 'cdn.shopify.com', 'i.imgur.com']);
export function safeImageUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 4096) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || !imageHosts.has(url.hostname)) return null;
    if (url.searchParams.has('api_key') || (url.hostname === 'serpapi.com' && !url.pathname.startsWith('/searches/'))) return null;
    return url.toString();
  } catch { return null; }
}
export function sourceUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password ? u.toString() : null; } catch { return null; }
}
export function validateQuery(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Consulta inválida');
  const query = value.replace(/\s+/g, ' ').trim();
  if (query.length < 2 || query.length > 240 || /[\x00-\x1f]/.test(query)) throw new Error('Consulta inválida');
  return query;
}
const dimension = (value: unknown) => typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= 50000 ? value : undefined;
export function normalizeCoverResults(body: unknown) {
  if (!body || typeof body !== 'object') throw new Error('Resposta inválida');
  const data = body as Record<string, unknown>;
  if (data.error) throw new Error('Busca indisponível');
  if (!Array.isArray(data.images_results)) {
    if (data.images_results === undefined && data.search_information && typeof data.search_information === 'object' && (data.search_information as Record<string, unknown>).image_results_state === 'Fully empty') return [];
    throw new Error('Resposta inválida');
  }
  const seen = new Set<string>();
  return data.images_results.flatMap((raw: unknown, index: number) => {
    if (!raw || typeof raw !== 'object') return [];
    const row = raw as Record<string, unknown>;
    const original = safeImageUrl(row.original);
    const thumbnail = safeImageUrl(row.thumbnail);
    const imageUrl = original ?? thumbnail;
    if (!imageUrl || seen.has(imageUrl)) return [];
    seen.add(imageUrl);
    // Dimensions only apply to the original, not a fallback thumbnail.
    const width = original ? dimension(row.original_width) : undefined;
    const height = original ? dimension(row.original_height) : undefined;
    return [{ id: String(index), thumbnailUrl: thumbnail ?? imageUrl, imageUrl, sourceUrl: sourceUrl(row.link), sourceTitle: typeof row.title === 'string' ? row.title.slice(0, 200) : '', width, height }];
  }).sort((a, b) => Number(!!b.width && !!b.height && b.height > b.width) - Number(!!a.width && !!a.height && a.height > a.width)).slice(0, 30);
}
export async function readLimited(response: Response, max: number): Promise<Uint8Array> {
  const advertised = Number(response.headers.get('content-length'));
  if (advertised > max) { await response.body?.cancel(); throw new Error('Arquivo muito grande'); }
  if (!response.body) throw new Error('Resposta vazia');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read(); if (done) break;
      size += value.length;
      if (size > max) throw new Error('Arquivo muito grande');
      chunks.push(value);
    }
  } finally { await reader.cancel(); reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return bytes;
}
export function imageExtension(bytes: Uint8Array, mime: string): string {
  if (mime === 'image/jpeg' && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'jpg';
  if (mime === 'image/png' && [137,80,78,71,13,10,26,10].every((v,i) => bytes[i] === v)) return 'png';
  if (mime === 'image/webp' && String.fromCharCode(...bytes.slice(0,4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8,12)) === 'WEBP') return 'webp';
  throw new Error('Imagem inválida');
}
export async function downloadCover(url: string, fetcher: typeof fetch = fetch) {
  let next = url;
  const signal = AbortSignal.timeout(12000);
  for (let hop = 0; hop < 4; hop++) {
    const safe = safeImageUrl(next); if (!safe) throw new Error('Origem não permitida');
    const response = await fetcher(safe, { redirect: 'manual', signal });
    if ([301,302,303,307,308].includes(response.status)) {
      const location = response.headers.get('location'); await response.body?.cancel();
      if (!location) throw new Error('Imagem indisponível');
      next = new URL(location, safe).toString(); continue;
    }
    if (!response.ok) { await response.body?.cancel(); throw new Error('Imagem indisponível'); }
    const mime = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() ?? '';
    if (!['image/jpeg','image/png','image/webp'].includes(mime)) { await response.body?.cancel(); throw new Error('Imagem inválida'); }
    const bytes = await readLimited(response, MAX_IMAGE_BYTES);
    if (!bytes.length) throw new Error('Imagem vazia');
    return { bytes, mime, extension: imageExtension(bytes, mime) };
  }
  throw new Error('Redirecionamentos demais');
}
const encode = (data: Uint8Array) => btoa(Array.from(data, x => String.fromCharCode(x)).join('')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const decode = (data: string) => Uint8Array.from(atob(data.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
async function signingKey(secret: string) {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(`acervo-cover-v1:${secret}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign','verify']);
}
export async function signCover(url: string, userId: string, secret: string, now = Date.now()): Promise<string> {
  if (!safeImageUrl(url)) throw new Error('Origem não permitida');
  const payload = encode(new TextEncoder().encode(JSON.stringify({ url, userId, expires: now + 30 * 60 * 1000 })));
  const signature = await crypto.subtle.sign('HMAC', await signingKey(secret), new TextEncoder().encode(payload));
  return `${payload}.${encode(new Uint8Array(signature))}`;
}
export async function verifyCover(token: unknown, userId: string, secret: string, now = Date.now()): Promise<string> {
  if (typeof token !== 'string' || token.length > 12000) throw new Error('Seleção inválida');
  const parts = token.split('.'); if (parts.length !== 2) throw new Error('Seleção inválida');
  try {
    if (!await crypto.subtle.verify('HMAC', await signingKey(secret), decode(parts[1]), new TextEncoder().encode(parts[0]))) throw new Error();
    const value = JSON.parse(new TextDecoder().decode(decode(parts[0])));
    if (value.userId !== userId || !Number.isFinite(value.expires) || value.expires <= now || !safeImageUrl(value.url)) throw new Error();
    return value.url;
  } catch { throw new Error('Seleção expirada ou inválida. Pesquise novamente.'); }
}
