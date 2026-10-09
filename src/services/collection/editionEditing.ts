import type { EditionRow } from '../supabase/types.ts';
export interface EditionFormValues { editionName: string; publisher: string; country: string; region: string; discCount: string; customCoverUrl: string | null }
export type EditionEdit = Pick<EditionRow, 'edition_name' | 'publisher' | 'country' | 'region' | 'disc_count' | 'custom_cover_url'>;
export function parseDiscCount(value: string): number | null {
  const text = value.trim();
  if (!text) return null;
  if (!/^[1-9]\d*$/.test(text) || !Number.isSafeInteger(Number(text)) || Number(text) > 2147483647) throw new Error('Informe um número inteiro de discos, a partir de 1.');
  return Number(text);
}
export function parseEditionForm(form: EditionFormValues): EditionEdit {
  const text = (value: string) => { const result = value.trim(); if (result.length > 200) throw new Error('Use até 200 caracteres por campo.'); return result || null; };
  return { edition_name: text(form.editionName), publisher: text(form.publisher), country: text(form.country), region: text(form.region), disc_count: parseDiscCount(form.discCount), custom_cover_url: form.customCoverUrl?.trim() || null };
}
export function discCountLabel(value: number | null | undefined): string | null {
  return value == null ? null : `${value} ${value === 1 ? 'disco' : 'discos'}`;
}
