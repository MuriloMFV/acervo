import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryClient';
import { searchMovies } from '../services/tmdb';
import type { MovieSearchCandidate } from '../types/movieSearch';

interface SearchState {
  query: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  results: MovieSearchCandidate[];
  retry: () => void;
}

export function useMovieSearch(query: string): SearchState {
  const text = query.trim();
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(text), 400);
    return () => clearTimeout(timeout);
  }, [text]);
  const result = useQuery({
    queryKey: queryKeys.search(debounced),
    queryFn: ({ signal }) => searchMovies(debounced, signal),
    enabled: text.length >= 2 && debounced === text,
    staleTime: 300_000,
    retry: false,
  });
  const retry = () => { void result.refetch(); };
  if (text.length < 2) return { query: text, status: 'idle', results: [], retry };
  // Hide an older query's results during debounce; Query cancels unused requests.
  if (debounced !== text || result.isPending) return { query: text, status: 'loading', results: [], retry };
  if (result.isError) return { query: text, status: 'error', results: [], retry };
  return { query: text, status: 'success', results: result.data ?? [], retry };
}
