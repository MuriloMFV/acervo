import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 }, mutations: { retry: false } },
});

export const queryKeys = {
  barcodeWeb: (userId: string, code: string) => ['barcode-web', userId, code] as const,
  barcodes: (userId: string) => ['barcode', userId] as const,
  barcode: (userId: string, code: string) => ['barcode', userId, code] as const,
  profile: (userId: string) => ['profile', userId] as const,
  collection: (userId: string) => ['collection', userId] as const,
  item: (userId: string, id: string) => ['collection', userId, id] as const,
  movie: (id: string) => ['movie-details', id] as const,
  search: (query: string) => ['movie-search', query] as const,
};
