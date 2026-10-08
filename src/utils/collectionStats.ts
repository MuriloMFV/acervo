import type { CollectionRecord } from '../services/collection/types';
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
export function calculateCollectionStats(items: readonly CollectionRecord[]): CollectionStats {
  const formats = { DVD: 0, BLURAY: 0, UHD_4K: 0, VHS: 0 };
  const genres = new Map<string, number>(); const decades = new Map<string, number>(); const directors = new Map<string, number>();
  let cents = 0; let pricedItems = 0; let favorites = 0; let specialEditions = 0;
  for (const item of items) {
    const { edition } = item; const movie = edition.movie;
    formats[edition.media_format]++;
    new Set(movie.genres.map((genre) => genre.trim())).forEach((genre) => increment(genres, genre));
    const decade = releaseDecade(movie.release_year);
    if (decade !== null) increment(decades, `${decade}s`);
    increment(directors, movie.director);
    if (item.purchase_price !== null && Number.isFinite(item.purchase_price)) { cents += Math.round(item.purchase_price * 100); pricedItems++; }
    if (item.is_favorite) favorites++;
    if (edition.is_special_edition || edition.is_limited_edition) specialEditions++;
  }
  return { total: items.length, formats, genre: mostFrequent(genres), decade: mostFrequent(decades), director: mostFrequent(directors), registeredValue: cents / 100, pricedItems, favorites, specialEditions };
}
