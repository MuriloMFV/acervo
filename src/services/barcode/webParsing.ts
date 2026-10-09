import { inferMediaFormat, productMovieQuery, validatedBarcode } from '../../utils/barcode.ts';
import type { BarcodeWebCandidate } from '../../types/barcodeWeb.ts';

export function barcodeWebQuery(value: string): string { return `"${validatedBarcode(value)}"`; }
const text = (value: unknown): string => typeof value === 'string' ? value.replace(/\s+/g,' ').trim() : '';
export function safeBarcodeWebUrl(value: unknown): string | null {
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
export interface BarcodeWebDiagnostic {
  position: number;
  reason: 'invalid-row' | 'unsafe-url' | 'missing-title' | 'no-evidence' | 'duplicate' | 'domain-limit' | 'accepted';
  title: string;
  snippet: string;
  sourceDomain: string | null;
}
export function normalizeBarcodeWebResults(body: unknown, value: string, diagnose?: (row: BarcodeWebDiagnostic) => void): BarcodeWebCandidate[] {
  const barcode = validatedBarcode(value);
  if (!body || typeof body !== 'object') throw new Error('Resposta inválida');
  const data = body as Record<string,unknown>;
  if (typeof data.error === 'string' && /^Google (?:hasn't|has not) returned any results for this query\.?$/i.test(data.error.trim())) return [];
  if (data.error) throw new Error('Busca web indisponível');
  if (data.organic_results === undefined) {
    const info = data.search_information as Record<string,unknown> | undefined;
    if (info?.organic_results_state === 'Fully empty' || info?.total_results === 0) return [];
    throw new Error('Resposta inválida');
  }
  if (!Array.isArray(data.organic_results)) throw new Error('Resposta inválida');
  const seen = new Set<string>(); const domains = new Map<string,number>();
  return data.organic_results.flatMap((raw: unknown, position: number): BarcodeWebCandidate[] => {
    if (!raw || typeof raw !== 'object') {
      diagnose?.({position,reason:'invalid-row',title:'',snippet:'',sourceDomain:null});
      return [];
    }
    const row = raw as Record<string,unknown>;
    const title = text(row.title).slice(0,200), snippet = text(row.snippet).slice(0,400);
    const sourceUrl = safeBarcodeWebUrl(row.link);
    const domain = sourceUrl ? new URL(sourceUrl).hostname.replace(/^www\./,'') : null;
    const record = (reason: BarcodeWebDiagnostic['reason']) => diagnose?.({position,reason,title,snippet,sourceDomain:domain});
    if (!sourceUrl) { record('unsafe-url'); return []; }
    if (title.length < 3) { record('missing-title'); return []; }
    const canonical = sourceUrl.split('?')[0];
    const evidence = `${title} ${snippet}`;
    const format = inferMediaFormat(evidence);
    // Catalog snippets may contain only the exact barcode, without media words.
    // Keep a meaningful named suggestion; the user still confirms it via TMDB.
    const namedTitle = title.replace(barcode, '').replace(/\b(?:ean|upc|gtin|barcode|c[oó]digo|de|barras)\b/gi, '').trim();
    const barcodeEvidence = new RegExp(`(?<!\\d)${barcode}(?!\\d)`).test(evidence);
    if (!format && !/\b(?:filme|cinema|movie)\b/i.test(evidence) && !(barcodeEvidence && /[\p{L}]{3}/u.test(namedTitle))) { record('no-evidence'); return []; }
    if (seen.has(canonical)) { record('duplicate'); return []; }
    if ((domains.get(domain!) ?? 0) >= 2) { record('domain-limit'); return []; }
    seen.add(canonical); domains.set(domain!, (domains.get(domain!) ?? 0)+1);
    record('accepted');
    const segment = title.split(/\s(?:\||[-–—])\s/)[0];
    const cleaned = productMovieQuery(segment.replace(barcode,'')).replace(/^[\s:,-]+|[\s:,-]+$/g,'').trim();
    return [{
      id: canonical, title, snippet, sourceUrl, sourceDomain: domain!,
      imageUrl: safeBarcodeWebUrl(row.thumbnail), detectedTitle: cleaned.length >= 2 && !/^\d+$/.test(cleaned) ? cleaned : null,
      detectedFormat: format, detectedPublisher: field(evidence,'distribuidora|distribuidor|publisher'),
      detectedCountry: field(evidence,'país|pais|country'),
      detectedRegion: evidence.match(/\b(?:regi[aã]o|region)\s*:?\s*(ABC|[0-9ABC])\b/i)?.[1] ?? null,
      detectedEditionName: field(evidence,'edição|edicao|edition'),
      confidenceHints: [...(barcodeEvidence ? ['Código citado na página'] : []), ...(format ? ['Formato citado na página'] : [])],
    }];
  }).slice(0,10);
}
