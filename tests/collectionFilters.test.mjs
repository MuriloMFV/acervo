import assert from 'node:assert/strict';
import test from 'node:test';
import { applyCollectionFilters, availableCollectionFilters, defaultCollectionFilters, filtersForShortcut, hasActiveFilters, toggleFilterValue } from '../src/utils/collectionFilters.ts';
import { calculateCollectionStats } from '../src/utils/collectionStats.ts';

function record(id, title, { movie = {}, edition = {}, ...copy } = {}) {
  const timestamps = { created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' };
  return {
    ...timestamps, id, user_id: 'owner', edition_id: `edition-${id}`, condition: 'GOOD', purchase_price: null, purchase_date: null, purchase_place: null, is_favorite: false, notes: null, ...copy,
    edition: { ...timestamps, id: `edition-${id}`, movie_id: `movie-${id}`, media_format: 'DVD', packaging_type: 'STANDARD', barcode: null, publisher: null, region: null, country: null, edition_name: null, product_image_url: null, custom_cover_url: null, is_special_edition: false, is_limited_edition: false, disc_count: null, release_year: null, ...edition,
      movie: { ...timestamps, id: `movie-${id}`, tmdb_id: null, title, original_title: null, release_year: null, overview: null, runtime: null, poster_url: null, backdrop_url: null, director: null, genres: [], ...movie },
    },
  };
}
const items = [
  record('1', 'Pânico', { created_at: '2026-03-01T00:00:00Z', condition: 'SEALED', purchase_price: 30, is_favorite: true, movie: { release_year: 1996, genres: ['Terror', 'Mistério'], director: 'Wes Craven' }, edition: { media_format: 'BLURAY', packaging_type: 'STEELBOOK', region: ' A ', is_limited_edition: true } }),
  record('2', 'Alien', { created_at: '2026-01-01T00:00:00Z', condition: 'LIKE_NEW', purchase_price: 0, movie: { release_year: 1979, genres: ['Terror', 'Ficção científica'], director: 'Ridley Scott' }, edition: { media_format: 'UHD_4K', region: 'B', is_special_edition: true } }),
  record('3', 'Pânico 2', { created_at: '2026-02-01T00:00:00Z', condition: 'VERY_GOOD', purchase_price: 10, is_favorite: true, movie: { release_year: 1997, genres: ['Terror'], director: 'Wes Craven' }, edition: { packaging_type: 'DIGIPAK' } }),
  record('4', 'Zorro', { created_at: '2026-04-01T00:00:00Z', condition: 'FAIR', movie: { release_year: 1969 }, edition: { media_format: 'VHS', packaging_type: 'BOX' } }),
  record('5', 'Blade Runner', { created_at: '2026-05-01T00:00:00Z', condition: 'GOOD', movie: { release_year: 1982, genres: ['Ficção científica'], director: 'Ridley Scott' }, edition: { media_format: 'BLURAY' } }),
];
const ids = (values) => values.map((item) => item.id);
const select = (filters = {}, search = '', source = items) => applyCollectionFilters(source, search, { ...defaultCollectionFilters(), ...filters });

test('formats use OR internally and combine with trimmed case-insensitive title search', () => {
  assert.deepEqual(ids(select({ formats: ['BLURAY', 'DVD'] }, ' PÂNICO ')), ['1', '3']);
  assert.deepEqual(ids(select({ formats: ['DVD'] }, 'alien')), []);
  assert.equal(select({}, '').length, 5);
});
test('all condition values and decade filters are applied to the copy and movie', () => {
  for (const [condition, id] of [['SEALED', '1'], ['LIKE_NEW', '2'], ['VERY_GOOD', '3'], ['FAIR', '4'], ['GOOD', '5']]) assert.deepEqual(ids(select({ conditions: [condition] })), [id]);
  assert.deepEqual(ids(select({ decades: [1990] })), ['1', '3']);
  assert.deepEqual(ids(select({ decades: [1960, 1970] })), ['4', '2']);
});
test('packaging filters stay separate from special and limited flags', () => {
  assert.deepEqual(ids(select({ editions: ['STEELBOOK'] })), ['1']);
  assert.deepEqual(ids(select({ editions: ['DIGIPAK'] })), ['3']);
  assert.deepEqual(ids(select({ editions: ['BOX'] })), ['4']);
  assert.deepEqual(ids(select({ editions: ['SPECIAL'] })), ['2']);
  assert.deepEqual(ids(select({ editions: ['LIMITED'] })), ['1']);
  assert.deepEqual(ids(select({ editions: ['SPECIAL', 'BOX'] })), ['4', '2']);
  assert.deepEqual(ids(select({ specialOnly: true })), ['1', '2']);
  assert.deepEqual(ids(select({ favoritesOnly: true })), ['1', '3']);
});
test('all criteria combine with AND and include actual genre and region', () => {
  const filters = { formats: ['BLURAY', 'DVD'], editions: ['STEELBOOK', 'DIGIPAK'], genres: ['Terror'], decades: [1990], conditions: ['SEALED', 'LIKE_NEW'], regions: ['A'], favoritesOnly: true, specialOnly: true };
  assert.deepEqual(ids(select(filters, 'PÂNICO')), ['1']);
  assert.deepEqual(select({ ...filters, regions: ['C'] }), []);
  assert.deepEqual(select({ genres: ['Comédia'] }), []);
});
test('all eight sorts use actual dates, titles, years and prices; zero is preserved', () => {
  const expected = {
    RECENT: ['5', '4', '1', '3', '2'], OLDEST: ['2', '3', '1', '4', '5'],
    TITLE_ASC: ['2', '5', '1', '3', '4'], TITLE_DESC: ['4', '3', '1', '5', '2'],
    YEAR_DESC: ['3', '1', '5', '2', '4'], YEAR_ASC: ['4', '2', '5', '1', '3'],
    PRICE_DESC: ['1', '3', '2', '5', '4'], PRICE_ASC: ['2', '3', '1', '5', '4'],
  };
  for (const [sort, order] of Object.entries(expected)) assert.deepEqual(ids(select({ sort })), order, sort);
});
test('null years, prices and invalid dates sort last in both directions, with stable ties', () => {
  const a = record('a', 'Igual', { purchase_price: 5, movie: { release_year: 2000 } });
  const b = record('b', 'Igual', { purchase_price: 5, movie: { release_year: 2000 } });
  const absent = record('c', 'Ausente', { created_at: 'invalid' });
  for (const sort of ['YEAR_ASC', 'YEAR_DESC', 'PRICE_ASC', 'PRICE_DESC', 'RECENT', 'OLDEST']) {
    assert.deepEqual(ids(select({ sort }, '', [absent, b, a])), ['a', 'b', 'c']);
    assert.deepEqual(ids(select({ sort }, '', [a, b, absent])), ['a', 'b', 'c']);
  }
});
test('source order and nested values are never mutated; an empty collection works', () => {
  const before = structuredClone(items);
  select({ sort: 'TITLE_ASC' });
  assert.deepEqual(items, before);
  assert.deepEqual(select({}, '', []), []);
});
test('options derive genres, regions and older decades from full data without inventing regions', () => {
  assert.deepEqual(availableCollectionFilters(items), { genres: ['Ficção científica', 'Mistério', 'Terror'], regions: ['A', 'B'], decades: [2020, 2010, 2000, 1990, 1980, 1970, 1960] });
  assert.deepEqual(availableCollectionFilters([]).regions, []);
});
test('defaults and shortcuts reset criteria; filter activity and toggles are immutable', () => {
  const first = defaultCollectionFilters(); first.formats.push('DVD');
  assert.deepEqual(defaultCollectionFilters().formats, []);
  assert.equal(hasActiveFilters(defaultCollectionFilters()), false);
  assert.equal(hasActiveFilters({ ...defaultCollectionFilters(), sort: 'OLDEST' }), false);
  assert.equal(hasActiveFilters(first), true);
  for (const key of ['favoritesOnly', 'specialOnly']) assert.equal(hasActiveFilters({ ...defaultCollectionFilters(), [key]: true }), true);
  const values = ['DVD']; assert.deepEqual(toggleFilterValue(values, 'DVD'), []); assert.deepEqual(toggleFilterValue(values, 'VHS'), ['DVD', 'VHS']); assert.deepEqual(values, ['DVD']);
  assert.deepEqual(ids(select(filtersForShortcut('FAVORITES'))), ['1', '3']);
  assert.deepEqual(ids(select(filtersForShortcut('SPECIAL_EDITIONS'))), ['1', '2']);
  assert.deepEqual(filtersForShortcut('RECENT'), defaultCollectionFilters());
});
test('statistics count copies, all formats, each genre, decades, directors and registered prices', () => {
  assert.deepEqual(calculateCollectionStats(items), { total: 5, individualMovies: 5, boxes: 0, totalMovies: 5, formats: { DVD: 1, BLURAY: 2, UHD_4K: 1, VHS: 1 }, genre: { label: 'Terror', count: 3 }, decade: { label: '1990s', count: 2 }, director: { label: 'Ridley Scott', count: 2 }, registeredValue: 40, pricedItems: 3, favorites: 2, specialEditions: 2 });
  const sameMovie = { ...items[0], id: 'another-copy' };
  assert.equal(calculateCollectionStats([items[0], sameMovie]).total, 2);
  assert.equal(calculateCollectionStats([items[0], sameMovie]).genre.count, 2);
});
test('empty and absent statistics do not invent metadata or registered prices', () => {
  const empty = calculateCollectionStats([]);
  assert.deepEqual(empty, { total: 0, individualMovies: 0, boxes: 0, totalMovies: 0, formats: { DVD: 0, BLURAY: 0, UHD_4K: 0, VHS: 0 }, genre: null, decade: null, director: null, registeredValue: 0, pricedItems: 0, favorites: 0, specialEditions: 0 });
  const absent = calculateCollectionStats([record('1', 'Sem dados', { movie: { director: ' ', genres: ['', ' '] } })]);
  assert.equal(absent.genre, null); assert.equal(absent.decade, null); assert.equal(absent.director, null); assert.equal(absent.pricedItems, 0);
  assert.equal(calculateCollectionStats([record('2', 'Grátis', { purchase_price: 0 })]).pricedItems, 1);
});
test('statistical ties are deterministic regardless of input order', () => {
  const tied = [record('1', 'A', { movie: { genres: ['Z', 'Z', ' '], release_year: 2000, director: ' Z ' } }), record('2', 'B', { movie: { genres: ['A'], release_year: 1999, director: 'A' } })];
  const stats = calculateCollectionStats(tied);
  assert.deepEqual(stats, calculateCollectionStats([...tied].reverse()));
  assert.deepEqual(stats.genre, { label: 'A', count: 1 });
  assert.deepEqual(stats.decade, { label: '1990s', count: 1 });
  assert.deepEqual(stats.director, { label: 'A', count: 1 });
});
test('money sums in cents and statistics remain based on the full collection', () => {
  assert.equal(calculateCollectionStats([record('1', 'A', { purchase_price: 0.1 }), record('2', 'B', { purchase_price: 0.2 })]).registeredValue, 0.3);
  const full = calculateCollectionStats(items);
  select({ formats: ['DVD'] }, 'pânico');
  assert.deepEqual(calculateCollectionStats(items), full);
});
