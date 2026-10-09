import type { CollectionPreviewItem } from '../../types/collectionPreview';
import type { CollectionItemDetailsPreview } from '../../types/collectionDetails';
import type { Database, EditionRow, ItemCondition, MediaFormat } from '../supabase/types';
import type { CollectionRecord, CopyFormValues, CopyUpdate, MovieForCollection } from './types';
import type { KnownEdition } from '../../types/barcode';

export function isCollectionItemId(id: string): boolean {
  return /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(id);
}

export function collectionCover(item: CollectionRecord): string | null {
  return item.use_photo_as_cover && item.photo_url && item.photo_cover_url?.trim() || editionCover(item.edition);
}
export function editionCover(edition: KnownEdition): string | null {
  return edition.custom_cover_url?.trim() || edition.product_image_url?.trim() || edition.movie.poster_url?.trim() || null;
}
export function mapCollectionCard(item: CollectionRecord): CollectionPreviewItem {
  const cover = collectionCover(item);
  return { id: item.id, title: item.edition.movie.title, year: item.edition.movie.release_year, poster: cover ? { uri: cover } : null, mediaFormat: item.edition.media_format };
}
export function mapCollectionDetails(item: CollectionRecord): CollectionItemDetailsPreview {
  const { edition } = item;
  const movie = edition.movie;
  const cover = collectionCover(item);
  return {
    id: item.id,
    movie: { title: movie.title, originalTitle: movie.original_title ?? '', year: movie.release_year, director: movie.director ?? '', genres: movie.genres, runtime: movie.runtime, overview: movie.overview ?? '', poster: cover ? { uri: cover } : null, backdrop: movie.backdrop_url ? { uri: movie.backdrop_url } : null },
    edition: { mediaFormat: edition.media_format, region: edition.region, country: edition.country, publisher: edition.publisher, barcode: edition.barcode, packagingType: edition.packaging_type, editionName: edition.edition_name ?? undefined, discCount: edition.disc_count },
    copy: { condition: item.condition, purchasePrice: item.purchase_price, purchaseDate: item.purchase_date, favorite: item.is_favorite, purchasePlace: item.purchase_place, notes: item.notes },
  };
}
export function moviePayload(movie: MovieForCollection): Database['public']['Tables']['movies']['Insert'] {
  const id = Number(movie.id);
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error('Filme inválido.');
  return { tmdb_id: id, title: movie.title, original_title: movie.originalTitle, release_year: movie.year, overview: movie.overview, runtime: movie.runtime, poster_url: movie.posterUrl, backdrop_url: movie.backdropUrl, director: movie.director ?? null, genres: movie.genres };
}
export function editionPayload(movieId: string, format: MediaFormat): Database['public']['Tables']['editions']['Insert'] {
  return { movie_id: movieId, media_format: format, packaging_type: 'STANDARD', is_special_edition: false, is_limited_edition: false, barcode: null, product_image_url: null, custom_cover_url: null };
}
export function isStandardEdition(edition: EditionRow, movieId: string, format: MediaFormat): boolean {
  return edition.movie_id === movieId && edition.media_format === format && edition.packaging_type === 'STANDARD' && !edition.is_special_edition && !edition.is_limited_edition && edition.barcode === null && edition.product_image_url === null && edition.custom_cover_url === null && edition.edition_name === null && edition.publisher === null && edition.region === null && edition.country === null && edition.disc_count === null && edition.release_year === null;
}
export function copyPayload(userId: string, editionId: string, condition: ItemCondition): Database['public']['Tables']['collection_items']['Insert'] {
  return { user_id: userId, edition_id: editionId, condition, is_favorite: false, purchase_price: null, purchase_date: null, purchase_place: null, notes: null };
}
export function parseCopyForm(form: CopyFormValues): CopyUpdate {
  const amount = form.price.trim();
  if (amount && !/^\d{1,10}([.,]\d{1,2})?$/.test(amount)) throw new Error('Preço inválido.');
  const date = form.date.trim();
  if (date) {
    const parsed = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00Z`) : new Date(NaN);
    if (!Number.isFinite(parsed.getTime()) || parsed.getUTCFullYear() < 1 || parsed.toISOString().slice(0, 10) !== date) throw new Error('Data inválida. Use AAAA-MM-DD.');
  }
  return { ...(form.usePhotoAsCover === undefined ? {} : { use_photo_as_cover: form.usePhotoAsCover }), ...(form.favorite === undefined ? {} : { is_favorite: form.favorite }), condition: form.condition, purchase_price: amount ? Number(amount.replace(',', '.')) : null, purchase_date: date || null, purchase_place: form.place.trim() || null, notes: form.notes.trim() || null };
}
