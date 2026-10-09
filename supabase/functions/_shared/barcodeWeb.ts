import { normalizeCoverResults } from './covers.ts';
import { isEmptyGoogleResult } from './serpapi.ts';
import { barcodeWebQuery, normalizeBarcodeWebResults, safeBarcodeWebUrl } from '../../../src/services/barcode/webParsing.ts';
import { inferMediaFormat, productMovieQuery, validatedBarcode } from '../../../src/utils/barcode.ts';
import type { BarcodeWebCandidate } from '../../../src/types/barcodeWeb.ts';

export function normalizeBarcodeImageResults(body: unknown): BarcodeWebCandidate[] {
  if (isEmptyGoogleResult(body)) return [];
  const seen = new Set<string>();
  return normalizeCoverResults(body).flatMap((image): BarcodeWebCandidate[] => {
    const sourceUrl = safeBarcodeWebUrl(image.sourceUrl);
    const title = image.sourceTitle.replace(/\s+/g, ' ').trim();
    if (!sourceUrl || title.length < 3 || !/\p{L}/u.test(title) || /site em manuten[cç][aã]o/i.test(title)) return [];
    const identity = `${sourceUrl}\n${image.imageUrl}`;
    if (seen.has(identity)) return [];
    seen.add(identity);
    const cleaned = productMovieQuery(title.split(/\s(?:\||[-–—])\s/)[0]);
    return [{
      id: `image:${image.id}`, title, snippet: 'Busca de imagens pelo código',
      sourceUrl, sourceDomain: new URL(sourceUrl).hostname.replace(/^www\./, ''),
      imageUrl: image.thumbnailUrl, detectedTitle: cleaned.length >= 2 ? cleaned : null,
      detectedFormat: inferMediaFormat(title), detectedPublisher: null, detectedCountry: null,
      detectedRegion: null, detectedEditionName: null, confidenceHints: ['Sugestão visual'],
    }];
  }).slice(0,10);
}

type Search = (engine: 'google' | 'google_images', query: string) => Promise<unknown>;
// At most one textual request, then one visual request on a useful-result miss.
export async function lookupBarcodeWebCandidates(value: string, search: Search): Promise<BarcodeWebCandidate[]> {
  const barcode = validatedBarcode(value);
  const query = barcodeWebQuery(barcode);
  const text = await search('google', query);
  const candidates = normalizeBarcodeWebResults(text, barcode);
  const organic = text && typeof text === 'object' && 'organic_results' in text && Array.isArray(text.organic_results) ? text.organic_results : [];
  console.info(JSON.stringify({stage:'barcode-results',barcode,queryMode:'quoted',organicCount:organic.length,candidates:candidates.length}));
  if (candidates.length) return candidates;
  console.info(JSON.stringify({stage:'barcode-images-fallback',barcode}));
  const images = await search('google_images', query);
  const visual = normalizeBarcodeImageResults(images);
  const raw = images && typeof images === 'object' && 'images_results' in images && Array.isArray(images.images_results) ? images.images_results : [];
  console.info(JSON.stringify({stage:'barcode-image-results',barcode,imageCount:raw.length,candidates:visual.length}));
  return visual;
}
