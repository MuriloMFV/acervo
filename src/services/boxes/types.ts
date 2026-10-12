import type { BoxSetRow, CollectionBoxRow, MovieRow, ItemCondition, MediaFormat } from '../supabase/types';
import type { VideoStandard } from '../../types/videoStandard';
import type { MovieSearchCandidate } from '../../types/movieSearch';
export type CollectionBoxRecord = CollectionBoxRow & {
  box_set: BoxSetRow & { movies: { position: number; movie: MovieRow }[] };
};
export interface BoxFormValues {
  name: string; mediaFormat: MediaFormat; barcode: string; coverUrl: string;
  backCoverUrl?: string | null;
  editionName: string; publisher: string; country: string; region: string; discCount: string;
  videoStandard?: VideoStandard | null;
  special: boolean; limited: boolean; condition: ItemCondition;
  price: string; date: string; place: string; notes: string;
  favorite?: boolean;
}
export type BoxMovieSelection = MovieSearchCandidate & { storedMovieId?: string };
