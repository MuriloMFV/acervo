import type { BoxSetRow, CollectionBoxRow, MovieRow, ItemCondition, MediaFormat } from '../supabase/types';
export type CollectionBoxRecord = CollectionBoxRow & {
  box_set: BoxSetRow & { movies: { position: number; movie: MovieRow }[] };
};
export interface BoxFormValues {
  name: string; mediaFormat: MediaFormat; barcode: string; coverUrl: string;
  editionName: string; publisher: string; country: string; region: string; discCount: string;
  special: boolean; limited: boolean; condition: ItemCondition;
  price: string; date: string; place: string; notes: string;
}
