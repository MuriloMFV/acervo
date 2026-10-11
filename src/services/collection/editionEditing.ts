import type { EditionRow, PackagingType } from '../supabase/types.ts';
import { packagingLabels } from '../../utils/collectionDetails.ts';
export interface EditionFormValues { editionName: string; publisher: string; country: string; region: string; discCount: string; customCoverUrl: string | null; backCoverUrl?: string | null; packagingType?: PackagingType }
export type EditionEdit = Pick<EditionRow, 'edition_name' | 'publisher' | 'country' | 'region' | 'disc_count' | 'custom_cover_url'> & Partial<Pick<EditionRow, 'back_cover_url' | 'packaging_type'>>;
export function parseDiscCount(value: string): number | null {
  const text = value.trim();
  if (!text) return null;
  if (!/^[1-9]\d*$/.test(text) || !Number.isSafeInteger(Number(text)) || Number(text) > 2147483647) throw new Error('Informe um número inteiro de discos, a partir de 1.');
  return Number(text);
}
export function parseEditionForm(form: EditionFormValues): EditionEdit {
  const text = (value: string) => { const result = value.trim(); if (result.length > 200) throw new Error('Use até 200 caracteres por campo.'); return result || null; };
  if (form.packagingType !== undefined && !Object.hasOwn(packagingLabels, form.packagingType)) throw new Error('Selecione um tipo de capa válido.');
  return { edition_name: text(form.editionName), publisher: text(form.publisher), country: text(form.country), region: text(form.region), disc_count: parseDiscCount(form.discCount), custom_cover_url: form.customCoverUrl?.trim() || null, ...(form.backCoverUrl === undefined ? {} : { back_cover_url: form.backCoverUrl?.trim() || null }), ...(form.packagingType === undefined ? {} : { packaging_type: form.packagingType }) };
}
export function discCountLabel(value: number | null | undefined): string | null {
  return value == null ? null : `${value} ${value === 1 ? 'disco' : 'discos'}`;
}
