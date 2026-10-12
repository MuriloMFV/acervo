import assert from 'node:assert/strict';
import test from 'node:test';
import { applyCollectionBoxFilters, applyCollectionFilters, availableCollectionFilters, defaultCollectionFilters, filtersForShortcut } from '../src/utils/collectionFilters.ts';
import { mergeCollectionItems } from '../src/utils/collectionItems.ts';
import { calculateCollectionStats } from '../src/utils/collectionStats.ts';
import { exportItems, buildCollectionDocument } from '../src/services/export/document.ts';

const film = (id, title, patch = {}) => ({ id, title, release_year: 2000, director: 'Diretor', genres: ['Aventura'], poster_url: `https://image.test/${id}.jpg`, ...patch });
function movie(id, patch = {}, edition = {}) {
  return { id, created_at: '2026-10-01', condition: 'GOOD', purchase_price: 0.1, is_favorite: false,
    edition: { media_format: 'DVD', packaging_type: 'STANDARD', region: '4', video_standard: 'NTSC',
      is_special_edition: false, is_limited_edition: false, disc_count: 1, movie: film('movie', 'Alien'), ...edition }, ...patch };
}
function box(id, patch = {}, metadata = {}) {
  return { id, created_at: '2026-10-12', condition: 'SEALED', purchase_price: 0.2, is_favorite: true,
    box_set: { name: 'Coleção', media_format: 'BLURAY', region: ' A ', video_standard: 'PAL',
      is_special_edition: false, is_limited_edition: true, disc_count: 8, cover_url: 'https://image.test/box.jpg',
      movies: Array.from({ length: 6 }, (_, index) => ({ position: index + 1, movie: film(`contained-${index}`, `Filme ${index + 1}`) })), ...metadata }, ...patch };
}
const boxes = [box('a'), box('b', { created_at: '2026-09-01', condition: 'FAIR', purchase_price: null, is_favorite: false }, {
  name: 'VHS clássicos', media_format: 'VHS', region: null, video_standard: null, is_limited_edition: false, is_special_edition: false,
}), box('c', { created_at: '2026-08-01', condition: 'GOOD' }, { name: 'DVD clássicos', media_format: 'DVD', region: '4', video_standard: 'NTSC', is_limited_edition: false, is_special_edition: true })];
const select = (patch = {}, search = '', source = boxes) => applyCollectionBoxFilters(source, search, { ...defaultCollectionFilters(), ...patch });
const ids = items => items.map(item => item.id);

test('box filters combine physical format, condition, favorite and region using OR within and AND across criteria', () => {
  assert.deepEqual(ids(select({ formats: ['DVD', 'VHS'] })), ['b', 'c']);
  assert.deepEqual(ids(select({ conditions: ['GOOD', 'SEALED'] })), ['a', 'c']);
  assert.deepEqual(ids(select({ favoritesOnly: true })), ['a', 'c']);
  assert.deepEqual(ids(select({ formats: ['BLURAY'], conditions: ['SEALED'], favoritesOnly: true, regions: ['A'] })), ['a']);
  assert.deepEqual(ids(select({ formats: ['BLURAY'], conditions: ['GOOD'] })), []);
});
test('region and encoding filter choices include boxes-only values and actual video encoding for both entities', () => {
  assert.deepEqual(ids(select({ regions: ['PAL'] })), ['a']);
  assert.deepEqual(ids(select({ regions: ['NTSC'] })), ['c']);
  assert.deepEqual(ids(select({ regions: ['4', 'PAL'] })), ['a', 'c']);
  const films = [movie('single')];
  assert.equal(applyCollectionFilters(films, '', { ...defaultCollectionFilters(), regions: ['NTSC'] }).length, 1);
  const options = availableCollectionFilters(films, boxes);
  assert.deepEqual(options.regions, ['4', 'A', 'NTSC', 'PAL']);
  assert.deepEqual(availableCollectionFilters([], [boxes[0]]).regions, ['A', 'PAL']);
  const legacy = box('legacy', {}, { region: ' NTSC ', video_standard: null });
  assert.deepEqual(ids(select({ regions: ['NTSC'] }, '', [legacy])), ['legacy']);
  assert.deepEqual(availableCollectionFilters([], [legacy]).regions, ['NTSC']);
});
test('box type and special/limited selectors use BoxSet flags without pretending to be a Movie or an Edition', () => {
  assert.deepEqual(ids(select({ editions: ['BOX'] })), ['a', 'b', 'c']);
  assert.deepEqual(ids(select({ editions: ['SPECIAL'] })), ['c']);
  assert.deepEqual(ids(select({ editions: ['LIMITED'] })), ['a']);
  assert.deepEqual(ids(select({ specialOnly: true })), ['a', 'c']);
  assert.deepEqual(select({ editions: ['STEELBOOK', 'DIGIPAK'] }), []);
  assert.deepEqual(select({ genres: ['Aventura'] }), []);
  assert.deepEqual(select({ decades: [2000] }), []);
});
test('recent and favorite shortcuts include boxes; mixed order uses CollectionBox date, not child movies', () => {
  const recent = filtersForShortcut('RECENT');
  const films = [movie('single')];
  const entries = mergeCollectionItems(applyCollectionFilters(films, '', recent), applyCollectionBoxFilters(boxes, '', recent), recent.sort);
  assert.deepEqual(ids(entries), ['box:a', 'single', 'box:b', 'box:c']);
  assert.deepEqual(ids(select(filtersForShortcut('FAVORITES'))), ['a', 'c']);
  assert.deepEqual(ids(select(filtersForShortcut('SPECIAL_EDITIONS'))), ['a', 'c']);
});
test('box search matches the box name, keeps one item and never matches contained movie names', () => {
  assert.deepEqual(ids(select({}, ' COLEÇÃO ')), ['a']);
  assert.deepEqual(select({}, 'Filme 1'), []);
  assert.equal(select({}, 'coleção')[0].box_set.movies.length, 6);
  const before = structuredClone(boxes); select({ sort: 'PRICE_ASC' });
  assert.deepEqual(boxes, before); assert.deepEqual(select({}, '', []), []);
});
test('one six-film box counts as one physical item, zero individual movies and six films in the collection', () => {
  const stats = calculateCollectionStats([], [boxes[0]]);
  assert.equal(stats.total, 1); assert.equal(stats.individualMovies, 0); assert.equal(stats.boxes, 1); assert.equal(stats.totalMovies, 6);
  assert.deepEqual(stats.formats, { DVD: 0, BLURAY: 1, UHD_4K: 0, VHS: 0 });
  assert.equal(stats.favorites, 1); assert.equal(stats.specialEditions, 1); assert.equal(stats.pricedItems, 1); assert.equal(stats.registeredValue, 0.2);
  assert.deepEqual(stats.genre, { label: 'Aventura', count: 6 });
  assert.deepEqual(stats.decade, { label: '2000s', count: 6 });
  assert.deepEqual(stats.director, { label: 'Diretor', count: 6 });
});
test('mixed statistics separate physical items and movie content; prices and formats count boxes just once', () => {
  const films = [movie('one'), movie('two', { purchase_price: null, is_favorite: true })];
  const stats = calculateCollectionStats(films, [boxes[0]]);
  assert.equal(stats.total, 3); assert.equal(stats.individualMovies, 2); assert.equal(stats.boxes, 1); assert.equal(stats.totalMovies, 8);
  assert.equal(stats.registeredValue, 0.3); assert.equal(stats.pricedItems, 2); assert.equal(stats.favorites, 2);
  assert.deepEqual(stats.formats, { DVD: 2, BLURAY: 1, UHD_4K: 0, VHS: 0 });
  assert.equal(stats.genre.count, 8);
  assert.deepEqual(calculateCollectionStats([...films].reverse(), [boxes[0]]), stats);
  // Existing semantics count each owned copy, including a repeated film in a box.
  const repeated = box('repeated', {}, { movies: [{ position: 1, movie: films[0].edition.movie }, { position: 2, movie: film('another', 'Outro') }] });
  assert.equal(calculateCollectionStats([films[0]], [repeated]).totalMovies, 3);
  assert.equal(calculateCollectionStats([], [boxes[0], { ...boxes[0], id: 'second-copy' }]).totalMovies, 12);
});
test('unknown metadata and zero price keep valid physical totals without fabricated movie statistics', () => {
  const emptyMetadata = box('missing', { purchase_price: 0, is_favorite: false }, { movies: [
    { position: 1, movie: film('a', 'A', { genres: [], release_year: null, director: null }) },
    { position: 2, movie: film('b', 'B', { genres: ['', ' '], release_year: null, director: ' ' }) },
  ] });
  const stats = calculateCollectionStats([], [emptyMetadata]);
  assert.equal(stats.total, 1); assert.equal(stats.totalMovies, 2); assert.equal(stats.pricedItems, 1); assert.equal(stats.registeredValue, 0);
  assert.equal(stats.genre, null); assert.equal(stats.decade, null); assert.equal(stats.director, null);
  const zero = calculateCollectionStats([], []);
  for (const field of ['total', 'individualMovies', 'boxes', 'totalMovies']) assert.equal(zero[field], 0);
});

const assets = { logo: 'data:image/png;base64,AAAA', bodyFont: 'AAAA', titleFont: 'AAAA', covers: {} };
const date = new Date('2026-10-12T12:00:00Z');
test('PDF includes one row per box and per individual copy, interleaved by title without altering sources', () => {
  const films = [movie('same', {}, { movie: film('one', 'Zulu') }), movie('other', {}, { movie: film('two', 'Alien') })];
  const input = box('same', {}, { name: 'Matrix coleção' });
  const before = structuredClone([films, input]);
  const rows = exportItems(films, [input]);
  assert.deepEqual(ids(rows), ['other', 'box:same', 'same']);
  assert.deepEqual(rows[1], { id: 'box:same', title: 'Matrix coleção', year: null, format: 'Blu-ray', condition: 'Lacrado', discCount: 8, coverUrl: 'https://image.test/box.jpg', type: 'Box', movieCount: 6 });
  assert.equal(rows[0].type, 'Filme'); assert.equal(rows[0].movieCount, 1);
  assert.deepEqual([films, input], before);
  const html = buildCollectionDocument(rows, date, { ...assets, covers: { same: 'data:image/jpeg;base64,BBBB', 'box:same': 'data:image/png;base64,AAAA' } });
  assert.match(html, /3 itens/); assert.match(html, /Tipo: Box · 6 filmes/); assert.match(html, /Blu-ray/); assert.match(html, /Lacrado/); assert.match(html, /<td>8<\/td>/);
  assert.equal((html.match(/<tr><td class="cover-cell">/g) ?? []).length, 3);
  assert.match(html, /src="data:image\/png;base64,AAAA"/); assert.match(html, /src="data:image\/jpeg;base64,BBBB"/);
  assert.doesNotMatch(html, /Filme 1/);
});
test('box-only PDF retains six columns, A4 pagination, no row splits and placeholder cover/discs', () => {
  const input = box('placeholder', {}, { disc_count: null, cover_url: null, movies: [
    { position: 2, movie: film('b', 'B', { poster_url: null }) }, { position: 1, movie: film('a', 'A', { poster_url: null }) },
  ] });
  const rows = exportItems([], [input]); const html = buildCollectionDocument(rows, date, assets);
  assert.equal(rows.length, 1); assert.equal(rows[0].coverUrl, null); assert.equal(rows[0].discCount, null);
  assert.match(html, /1 item/); assert.match(html, /Tipo: Box · 2 filmes/); assert.match(html, /Sem capa/); assert.match(html, /<td>—<\/td>/);
  assert.deepEqual([...html.matchAll(/<th>(.*?)<\/th>/g)].map(match => match[1]), ['Capa', 'Título', 'Ano', 'Formato', 'Condição', 'Discos']);
  assert.match(html, /size:A4/); assert.match(html, /table-header-group/); assert.match(html, /page-break-inside:avoid/);
});
test('box PDF preserves stored-cover fallback ordering and escapes box names', () => {
  const input = box('escape', {}, { name: '<script>alert("x")</script>', cover_url: null });
  input.box_set.movies.reverse();
  const rows = exportItems([], [input]);
  assert.equal(rows[0].coverUrl, 'https://image.test/contained-0.jpg');
  const html = buildCollectionDocument(rows, date, assets);
  assert.doesNotMatch(html, /<script>/); assert.match(html, /&lt;script&gt;/);
});
