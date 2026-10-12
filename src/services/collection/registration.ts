import { newEditionFields, parseCopyForm } from './mappers.ts';
import type { CopyFormValues, CopyUpdate, MovieForCollection, NewEditionDetails } from './types.ts';
import type { ItemCondition, MediaFormat } from '../supabase/types.ts';

export type NewCopyDetails = Partial<Omit<CopyFormValues, 'condition' | 'usePhotoAsCover'>>;
export function prepareCollectionRegistration(format: MediaFormat, condition: ItemCondition, details: NewEditionDetails = {}, copy: NewCopyDetails = {}) {
  return {
    edition: newEditionFields(format, details),
    copy: parseCopyForm({ condition, price: copy.price ?? '', date: copy.date ?? '', place: copy.place ?? '', notes: copy.notes ?? '', favorite: copy.favorite ?? false }),
  };
}
export type PreparedCollectionRegistration = ReturnType<typeof prepareCollectionRegistration>;

// Each writer receives only its own entity's fields, with links from the prior step.
export async function persistCollectionRegistration(movie: MovieForCollection, prepared: PreparedCollectionRegistration, writers: {
  movie: (movie: MovieForCollection) => Promise<{ id: string }>;
  edition: (movieId: string, fields: PreparedCollectionRegistration['edition']) => Promise<{ id: string }>;
  copy: (editionId: string, fields: CopyUpdate) => Promise<{ id: string }>;
}): Promise<{ id: string }> {
  const savedMovie = await writers.movie(movie);
  const savedEdition = await writers.edition(savedMovie.id, prepared.edition);
  return writers.copy(savedEdition.id, prepared.copy);
}
