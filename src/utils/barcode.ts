import type { MediaFormat } from '../services/supabase/types.ts';

export class InvalidBarcodeError extends Error {
  constructor() { super('Código inválido. Use 8, 12 ou 13 dígitos.'); this.name = 'InvalidBarcodeError'; }
}
export function normalizeBarcode(value: string): string { return value.replace(/\D/g, ''); }
export function isValidBarcode(code: string): boolean { return /^(?:\d{8}|\d{12}|\d{13})$/.test(code); }
export function validatedBarcode(value: string): string {
  const code = normalizeBarcode(value);
  if (!isValidBarcode(code)) throw new InvalidBarcodeError();
  return code;
}
// Equivalent zero-padded GTIN representations. Never rewrite the user's string.
export function barcodeAliases(code: string): string[] {
  const ean = code.padStart(13, '0');
  const aliases = [code, ean];
  if (ean.startsWith('0')) aliases.push(ean.slice(1));
  if (ean.startsWith('00000')) aliases.push(ean.slice(5));
  return [...new Set(aliases)];
}
export function inferMediaFormat(name: string | null): MediaFormat | null {
  if (!name) return null;
  if (/\b(?:4\s*k|uhd)\b/i.test(name)) return 'UHD_4K';
  if (/\bblu[\s-]?ray\b/i.test(name)) return 'BLURAY';
  if (/\bdvd\b/i.test(name)) return 'DVD';
  if (/\bvhs\b/i.test(name)) return 'VHS';
  return null;
}
// A search suggestion, never an automatic Movie association.
export function productMovieQuery(name: string | null): string {
  return (name ?? '')
    .replace(/\([^)]*\)|\[[^\]]*\]/g, ' ')
    .replace(/\b(?:4\s*k|uhd|blu[\s-]?ray|dvd|vhs|steelbook|digipak)\b/gi, ' ')
    .replace(/\b(?:(?:collector['’]?s|special|limited|extended|ultimate|deluxe|anniversary|edição especial|edição limitada)\s*(?:edition|edição)?|edition|widescreen|fullscreen|region\s*(?:free|[0-9abc]))\b/gi, ' ')
    .replace(/\b\d+\s*discs?\b/gi, ' ').replace(/[–—|]/g, ' ').replace(/\s+/g, ' ').trim();
}
