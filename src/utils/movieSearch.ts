import type { MovieSearchCandidate } from '../types/movieSearch';

export function searchMovieCandidates(items: readonly MovieSearchCandidate[], query: string): readonly MovieSearchCandidate[] {
  const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR');
  if (!normalizedQuery) return items;
  return items.filter((item) =>
    item.title.toLocaleLowerCase('pt-BR').includes(normalizedQuery) ||
    item.originalTitle.toLocaleLowerCase('pt-BR').includes(normalizedQuery),
  );
}

export function findMovieCandidate(items: readonly MovieSearchCandidate[], id: string | string[] | undefined): MovieSearchCandidate | undefined {
  return typeof id === 'string' ? items.find((item) => item.id === id) : undefined;
}
