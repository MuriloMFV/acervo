import type { EditionCandidate } from '../../types/barcode';
import type { UpcProduct } from './types';
import { barcodeAliases } from '../../utils/barcode.ts';
import { UpcError } from './client.ts';

function text(value: unknown): string | null { return typeof value === 'string' ? value.trim() || null : null; }
export function safeProductImage(value: unknown): string | null {
  const image = text(value);
  if (!image) return null;
  try {
    const url = new URL(image);
    return url.protocol === 'https:' && !url.username && !url.password ? image : null;
  } catch { return null; }
}
export function mapUpcProduct(product: UpcProduct, barcode: string): EditionCandidate {
  const images = Array.isArray(product.images) ? [...new Set(product.images.map(safeProductImage).filter((value): value is string => value !== null))] : [];
  return { barcode, title: text(product.title), rawProductName: text(product.title), description: text(product.description), brand: text(product.brand), publisher: null, images, primaryImageUrl: images[0] ?? null, source: 'UPCITEMDB' };
}
export function mapUpcResponse(response: unknown, barcode: string): EditionCandidate | null {
  if (!response || typeof response !== 'object' || !('code' in response)) throw new UpcError('response');
  if (response.code === 'NOT_FOUND') return null;
  if (response.code !== 'OK' || !('items' in response) || !Array.isArray(response.items)) throw new UpcError('response');
  if (!response.items.length) return null;
  const products = response.items.filter((item): item is UpcProduct => item !== null && typeof item === 'object' && !Array.isArray(item));
  if (!products.length) return null;
  const aliases = barcodeAliases(barcode);
  const match = products.find((item) => aliases.includes(text(item.ean) ?? '') || aliases.includes(text(item.upc) ?? ''));
  // Single-code lookup can omit ean/upc; accept one incomplete product, never a
  // different advertised barcode or an arbitrary product from a bulk result.
  const only = products.length === 1 && !text(products[0].ean) && !text(products[0].upc) ? products[0] : null;
  if (!match && !only) return null;
  const candidate = mapUpcProduct(match ?? only!, barcode);
  return candidate.title ? candidate : null;
}
