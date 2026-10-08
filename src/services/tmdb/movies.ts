import type { MovieSearchCandidate, MovieDetails } from '../../types/movieSearch';
import { tmdbGet, TmdbError } from './client.ts';
import { mapMovieCandidate, mapMovieDetails } from './mappers.ts';
import type { TmdbMovie, TmdbSearchResponse } from './types';

function isMovie(value: unknown): value is TmdbMovie {
  return typeof value === 'object' && value !== null && 'id' in value &&
    typeof value.id === 'number' && Number.isSafeInteger(value.id) && value.id > 0;
}

export async function searchMovies(query: string, signal?: AbortSignal): Promise<MovieSearchCandidate[]> {
  const text = query.trim();
  if (!text) return [];
  const response = await tmdbGet<TmdbSearchResponse>('/search/movie', { query: text, include_adult: 'false', page: '1' }, signal);
  if (!response || !Array.isArray(response.results)) throw new TmdbError('response');
  return response.results.filter(isMovie).map(mapMovieCandidate);
}

export async function getMovieDetails(id: string, signal?: AbortSignal): Promise<MovieDetails> {
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) throw new TmdbError('response');
  const movie = await tmdbGet<TmdbMovie>(`/movie/${id}`, { append_to_response: 'credits' }, signal);
  if (!isMovie(movie) || String(movie.id) !== id) throw new TmdbError('response');
  return mapMovieDetails(movie);
}
