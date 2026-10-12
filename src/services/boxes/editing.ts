import type { BoxFormValues, BoxMovieSelection, CollectionBoxRecord } from './types';
import { includedBoxMovies, isBoxMovieTmdbId } from './mappers.ts';
import { isCollectionItemId } from '../collection/mappers.ts';

export class BoxChangedError extends Error {
  constructor() { super('O box mudou. Reabra os detalhes antes de salvar.'); this.name = 'BoxChangedError'; }
}
export function boxFormValues(item?: CollectionBoxRecord): BoxFormValues {
  const box = item?.box_set;
  return {
    name: box?.name ?? '', mediaFormat: box?.media_format ?? 'DVD', barcode: box?.barcode ?? '', coverUrl: box?.cover_url ?? '',
    backCoverUrl: box?.back_cover_url ?? null,
    editionName: box?.edition_name ?? '', publisher: box?.publisher ?? '', country: box?.country ?? '', region: box?.region ?? '',
    videoStandard: box?.video_standard ?? null, discCount: box?.disc_count?.toString() ?? '',
    special: box?.is_special_edition ?? false, limited: box?.is_limited_edition ?? false,
    condition: item?.condition ?? 'GOOD', price: item?.purchase_price?.toString() ?? '', date: item?.purchase_date ?? '',
    place: item?.purchase_place ?? '', notes: item?.notes ?? '', favorite: item?.is_favorite ?? false,
  };
}
export function boxMovieSelection(item: CollectionBoxRecord): BoxMovieSelection[] {
  return includedBoxMovies(item).map(movie => ({
    id: movie.tmdb_id?.toString() ?? `stored:${movie.id}`, storedMovieId: movie.id,
    title: movie.title, originalTitle: movie.original_title ?? '', year: movie.release_year,
    posterUrl: movie.poster_url, director: movie.director ?? undefined,
  }));
}
export function validateBoxSelection(movies: readonly BoxMovieSelection[]): void {
  if (movies.length < 2 || movies.length > 100 || new Set(movies.map(movie => movie.id)).size !== movies.length
    || new Set(movies.filter(movie => movie.storedMovieId).map(movie => movie.storedMovieId)).size !== movies.filter(movie => movie.storedMovieId).length) {
    throw new Error('Selecione de 2 a 100 filmes diferentes.');
  }
  if (movies.some(movie => movie.storedMovieId ? !isCollectionItemId(movie.storedMovieId) : !isBoxMovieTmdbId(movie.id))) throw new Error('Filme inválido.');
}
// Existing links keep their Movie UUID, even for movies without a TMDB ID.
export async function resolveBoxMovieIds(movies: readonly BoxMovieSelection[], saveMovie: (movie: BoxMovieSelection) => Promise<string>): Promise<string[]> {
  validateBoxSelection(movies);
  const ids: string[] = [];
  for (const movie of movies) ids.push(movie.storedMovieId ?? await saveMovie(movie));
  if (ids.some(id => !isCollectionItemId(id)) || new Set(ids).size !== ids.length) throw new Error('Selecione filmes diferentes.');
  return ids;
}
