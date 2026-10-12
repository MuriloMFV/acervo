import type { BoxSetInput, BoxCopyInput } from '../supabase/types';
import type { CollectionPreviewItem } from '../../types/collectionPreview';
import type { BoxFormValues, CollectionBoxRecord } from './types';
import { parseDiscCount } from '../collection/editionEditing.ts';
import { parseCopyForm } from '../collection/mappers.ts';
import { validatedBarcode } from '../../utils/barcode.ts';
import { parseVideoStandard } from '../../utils/videoStandard.ts';

export function parseBoxForm(form: BoxFormValues): { box: BoxSetInput; copy: BoxCopyInput } {
  const text = (value: string) => {
    const trimmed = value.trim();
    if (trimmed.length > 200) throw new Error('Use até 200 caracteres por campo.');
    return trimmed || null;
  };
  const name = text(form.name);
  if (!name) throw new Error('Informe o nome do box.');
  if (!['DVD','BLURAY','UHD_4K','VHS'].includes(form.mediaFormat)) throw new Error('Formato inválido.');
  if (!['SEALED','LIKE_NEW','VERY_GOOD','GOOD','FAIR'].includes(form.condition)) throw new Error('Condição inválida.');
  const cover = form.coverUrl.trim();
  if (cover && (cover.length > 2048 || !/^https?:\/\/[^\s]+$/i.test(cover))) throw new Error('Use uma URL http/https para a capa ou deixe em branco.');
  return {
    box: { name, media_format: form.mediaFormat, barcode: form.barcode.trim() ? validatedBarcode(form.barcode) : null,
      cover_url: cover || null, edition_name: text(form.editionName), publisher: text(form.publisher),
      country: text(form.country), region: text(form.region), disc_count: parseDiscCount(form.discCount),
      ...(form.videoStandard === undefined ? {} : { video_standard: parseVideoStandard(form.videoStandard) }),
      is_special_edition: form.special, is_limited_edition: form.limited },
    copy: parseCopyForm({ condition: form.condition, price: form.price, date: form.date, place: form.place, notes: form.notes, favorite: form.favorite }),
  };
}
export function validateBoxMovieIds(ids: readonly string[]): void {
  if (ids.length < 2 || ids.length > 100 || new Set(ids).size !== ids.length) throw new Error('Selecione de 2 a 100 filmes diferentes.');
  if (ids.some(id => !isBoxMovieTmdbId(id))) throw new Error('Filme inválido.');
}
export function isBoxMovieTmdbId(id: string): boolean {
  return /^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id));
}
export function includedBoxMovies(box: CollectionBoxRecord) {
  return [...box.box_set.movies].sort((a, b) => a.position - b.position).map(link => link.movie);
}
export function boxCover(box: CollectionBoxRecord): string | null {
  return box.box_set.cover_url?.trim() || includedBoxMovies(box)[0]?.poster_url || null;
}
export function mapBoxCard(box: CollectionBoxRecord): CollectionPreviewItem {
  const cover = boxCover(box);
  return { id: `box:${box.id}`, title: box.box_set.name, year: null, mediaFormat: box.box_set.media_format,
    poster: cover ? { uri: cover } : null, kind: 'box', movieCount: box.box_set.movies.length };
}
