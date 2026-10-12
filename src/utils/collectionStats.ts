import type { CollectionRecord } from '../services/collection/types';
import type { CollectionBoxRecord } from '../services/boxes/types';
import type { MovieRow } from '../services/supabase/types';
import type { CollectionStats, FrequentValue } from '../types/collectionStats';
import { compareLabels, releaseDecade } from './collectionFilters.ts';

function increment(counts: Map<string, number>, value: string | null) {
  const label = value?.trim();
  if (label) counts.set(label, (counts.get(label) ?? 0) + 1);
}
function mostFrequent(counts: Map<string, number>): FrequentValue | null {
  let result: FrequentValue | null = null;
  for (const [label, count] of counts) {
    if (!result || count > result.count || (count === result.count && compareLabels(label, result.label) < 0)) result = { label, count };
  }
  return result;
}
export function calculateCollectionStats(items: readonly CollectionRecord[], boxes: readonly CollectionBoxRecord[] = []): CollectionStats {
  const formats = { DVD: 0, BLURAY: 0, UHD_4K: 0, VHS: 0 };
  const genres = new Map<string, number>(); const decades = new Map<string, number>(); const directors = new Map<string, number>();
  let cents = 0; let pricedItems = 0; let favorites = 0; let specialEditions = 0;
  const countMovie = (movie: Pick<MovieRow, 'genres' | 'release_year' | 'director'>) => {
    new Set(movie.genres.map((genre) => genre.trim())).forEach((genre) => increment(genres, genre));
    const decade = releaseDecade(movie.release_year);
    if (decade !== null) increment(decades, `${decade}s`);
    increment(directors, movie.director);
  };
  const countPhysicalItem = (item: CollectionRecord | CollectionBoxRecord, metadata: CollectionRecord['edition'] | CollectionBoxRecord['box_set']) => {
    formats[metadata.media_format]++;
    if (item.purchase_price !== null && Number.isFinite(item.purchase_price)) { cents += Math.round(item.purchase_price * 100); pricedItems++; }
    if (item.is_favorite) favorites++;
    if (metadata.is_special_edition || metadata.is_limited_edition) specialEditions++;
  };
  for (const item of items) {
    countPhysicalItem(item, item.edition);
    countMovie(item.edition.movie);
  }
  let boxMovies = 0;
  for (const item of boxes) {
    countPhysicalItem(item, item.box_set);
    boxMovies += item.box_set.movies.length;
    for (const { movie } of item.box_set.movies) countMovie(movie);
  }
  return { total: items.length + boxes.length, individualMovies: items.length, boxes: boxes.length, totalMovies: items.length + boxMovies,
    formats, genre: mostFrequent(genres), decade: mostFrequent(decades), director: mostFrequent(directors), registeredValue: cents / 100, pricedItems, favorites, specialEditions };
}
