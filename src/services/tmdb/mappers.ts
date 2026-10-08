import type { MovieSearchCandidate, MovieDetails } from '../../types/movieSearch';
import { tmdbConfig } from './config.ts';
import type { TmdbMovie } from './types';

export function extractReleaseYear(date: string | null | undefined): number | null {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date
    ? parsed.getUTCFullYear() : null;
}

export function mapMovieDetails(movie: TmdbMovie): MovieDetails {
  const path = movie.backdrop_path;
  const directors = Array.isArray(movie.credits?.crew) ? movie.credits.crew.filter((person) => person?.job === 'Director' && typeof person.name === 'string').map((person) => person.name) : [];
  return {
    ...mapMovieCandidate(movie),
    overview: typeof movie.overview === 'string' ? movie.overview.trim() || null : null,
    runtime: typeof movie.runtime === 'number' && movie.runtime > 0 ? movie.runtime : null,
    backdropUrl: typeof path === 'string' && /^\/[\w.-]+$/.test(path) ? `${tmdbConfig.imageBaseUrl}/${tmdbConfig.backdropSize}${path}` : null,
    genres: Array.isArray(movie.genres) ? [...new Set(movie.genres.filter((genre) => genre && typeof genre.name === 'string').map((genre) => genre.name))] : [],
    ...(directors.length ? { director: [...new Set(directors)].join(', ') } : {}),
  };
}

export function buildPosterUrl(path: string | null | undefined): string | null {
  // TMDB returns a file path, not an arbitrary remote URL.
  if (typeof path !== 'string' || !/^\/[\w.-]+$/.test(path)) return null;
  return `${tmdbConfig.imageBaseUrl}/${tmdbConfig.posterSize}${path}`;
}

export function mapMovieCandidate(movie: TmdbMovie): MovieSearchCandidate {
  const title = typeof movie.title === 'string' ? movie.title.trim() : '';
  const originalTitle = typeof movie.original_title === 'string' ? movie.original_title.trim() : '';
  return {
    id: String(movie.id),
    title: title || originalTitle || 'Título indisponível',
    originalTitle: originalTitle || title || 'Título indisponível',
    year: extractReleaseYear(movie.release_date),
    posterUrl: buildPosterUrl(movie.poster_path),
  };
}
