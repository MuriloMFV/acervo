import { inferMediaFormat, productMovieQuery, validatedBarcode } from '../../utils/barcode.ts';
import type { BarcodeWebCandidate } from '../../types/barcodeWeb.ts';

export function barcodeWebQuery(value: string): string { return `"${validatedBarcode(value)}"`; }
const text = (value: unknown): string => typeof value === 'string' ? value.replace(/\s+/g,' ').trim() : '';
function publicUrl(value: unknown): string | null {
  try {
    const u = new URL(text(value));
    if (u.protocol !== 'https:' || u.username || u.password || u.port || u.searchParams.has('api_key') || !u.hostname.includes('.') || /^[\d.]+$/.test(u.hostname) || u.hostname.includes(':') || /\.(?:local|localhost|internal)$/.test(u.hostname)) return null;
    u.hash = ''; return u.toString();
  } catch { return null; }
}
function field(value: string, label: string): string | null {
  const match = value.match(new RegExp(`(?:${label})\\s*:\\s*([^;|.]+)`, 'i'));
  return match?.[1].trim().slice(0,80) || null;
}
export function normalizeBarcodeWebResults(body: unknown, value: string): BarcodeWebCandidate[] {
  const barcode = validatedBarcode(value);
  if (!body || typeof body !== 'object') throw new Error('Resposta inválida');
  const data = body as Record<string,unknown>;
  if (data.error) throw new Error('Busca web indisponível');
  if (data.organic_results === undefined) {
    const info = data.search_information as Record<string,unknown> | undefined;
    if (info?.organic_results_state === 'Fully empty' || info?.total_results === 0) return [];
    throw new Error('Resposta inválida');
  }
  if (!Array.isArray(data.organic_results)) throw new Error('Resposta inválida');
  const seen = new Set<string>(); const domains = new Map<string,number>();
  return data.organic_results.flatMap((raw: unknown): BarcodeWebCandidate[] => {
    if (!raw || typeof raw !== 'object') return [];
    const row = raw as Record<string,unknown>;
    const title = text(row.title).slice(0,200), snippet = text(row.snippet).slice(0,400);
    const sourceUrl = publicUrl(row.link); if (!sourceUrl || title.length < 3) return [];
    const domain = new URL(sourceUrl).hostname.replace(/^www\./,'');
    const canonical = sourceUrl.split('?')[0];
    const evidence = `${title} ${snippet}`;
    const format = inferMediaFormat(evidence);
    if (!format && !/\b(?:filme|cinema|movie)\b/i.test(evidence)) return [];
    if (seen.has(canonical) || (domains.get(domain) ?? 0) >= 2) return [];
    seen.add(canonical); domains.set(domain,(domains.get(domain) ?? 0)+1);
    const segment = title.split(/\s(?:\||[-–—])\s/)[0];
    const cleaned = productMovieQuery(segment.replace(barcode,'')).replace(/^[\s:,-]+|[\s:,-]+$/g,'').trim();
    return [{
      id: canonical, title, snippet, sourceUrl, sourceDomain: domain,
      imageUrl: publicUrl(row.thumbnail), detectedTitle: cleaned.length >= 2 && !/^\d+$/.test(cleaned) ? cleaned : null,
      detectedFormat: format, detectedPublisher: field(evidence,'distribuidora|distribuidor|publisher'),
      detectedCountry: field(evidence,'país|pais|country'),
      detectedRegion: evidence.match(/\b(?:regi[aã]o|region)\s*:?\s*(ABC|[0-9ABC])\b/i)?.[1] ?? null,
      detectedEditionName: field(evidence,'edição|edicao|edition'),
      confidenceHints: [...(evidence.includes(barcode) ? ['Código citado na página'] : []), ...(format ? ['Formato citado na página'] : [])],
    }];
  }).slice(0,10);
}
