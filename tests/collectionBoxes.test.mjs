import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeCollectionItems } from '../src/utils/collectionItems.ts';
import { collectionGridSections } from '../src/utils/collectionSections.ts';
import { boxFormValues, boxMovieSelection, resolveBoxMovieIds, validateBoxSelection } from '../src/services/boxes/editing.ts';
import { parseBoxForm } from '../src/services/boxes/mappers.ts';

function movie(id, title, year, price, createdAt) {
  return { id, created_at: createdAt, purchase_price: price, edition: { media_format: 'DVD', packaging_type: 'STANDARD', movie: { title, release_year: year, poster_url: null } } };
}
function box(id, name, price, createdAt) {
  return { id, created_at: createdAt, purchase_price: price, box_set: { name, media_format: 'BLURAY', cover_url: null, movies: [] } };
}
const movies = [movie('m1', 'Alien', 1979, 0, '2026-01-01'), movie('m2', 'Zorro', 1998, 30, '2026-04-01')];
const boxes = [box('b1', 'Batman', 20, '2026-02-01'), box('b2', 'Matrix', null, '2026-03-01')];
test('boxes and movies use the same eight sorts instead of separate sections', () => {
  const expected = {
    RECENT: ['m2', 'box:b2', 'box:b1', 'm1'], OLDEST: ['m1', 'box:b1', 'box:b2', 'm2'],
    TITLE_ASC: ['m1', 'box:b1', 'box:b2', 'm2'], TITLE_DESC: ['m2', 'box:b2', 'box:b1', 'm1'],
    YEAR_ASC: ['m1', 'm2', 'box:b1', 'box:b2'], YEAR_DESC: ['m2', 'm1', 'box:b1', 'box:b2'],
    PRICE_ASC: ['m1', 'box:b1', 'm2', 'box:b2'], PRICE_DESC: ['m2', 'box:b1', 'm1', 'box:b2'],
  };
  const before = JSON.stringify([movies, boxes]);
  for (const [sort, ids] of Object.entries(expected)) assert.deepEqual(mergeCollectionItems(movies, boxes, sort).map(item => item.id), ids, sort);
  assert.equal(JSON.stringify([movies, boxes]), before);
});
test('grid rows share space with boxes, retain three columns and preserve route identities', () => {
  const entries = mergeCollectionItems(movies, boxes, 'RECENT');
  const sections = collectionGridSections(entries, 'RECENT');
  assert.equal(sections.length, 1);
  assert.equal(sections[0].label, null);
  assert.deepEqual(sections[0].data.map(row => row.items.map(item => item.id)), [['m2', 'box:b2', 'box:b1'], ['m1']]);
  assert.equal(entries[1].kind, 'box');
});
test('alphabetical sections combine a box and a movie with the same initial', () => {
  const sections = collectionGridSections(mergeCollectionItems([movies[0]], [box('b', 'Avatar', 0, '2026-01-01')], 'TITLE_ASC'), 'TITLE_ASC');
  assert.equal(sections.length, 1); assert.equal(sections[0].label, 'A');
  assert.deepEqual(sections[0].data[0].items.map(item => item.id), ['m1', 'box:b']);
});
test('missing prices/years/dates sort last; ties remain stable; boxes-only and movies-only collections work', () => {
  const missing = box('b', 'Alien', null, 'invalid');
  for (const sort of ['RECENT', 'OLDEST', 'PRICE_ASC', 'PRICE_DESC', 'YEAR_ASC', 'YEAR_DESC']) assert.equal(mergeCollectionItems([movies[0]], [missing], sort).at(-1).id, 'box:b');
  assert.deepEqual(mergeCollectionItems([], boxes, 'TITLE_ASC').map(item => item.id), ['box:b1', 'box:b2']);
  assert.deepEqual(mergeCollectionItems(movies, [], 'TITLE_ASC').map(item => item.id), ['m1', 'm2']);
  assert.deepEqual(mergeCollectionItems([], [], 'RECENT'), []);
  const tied = box('b', 'Alien', 0, '2026-01-01');
  assert.deepEqual(mergeCollectionItems([movies[0]], [tied], 'PRICE_ASC').map(item => item.id), ['box:b', 'm1']);
});

const m1 = '33333333-3333-4333-8333-333333333333', m2 = '44444444-4444-4444-8444-444444444444', m3 = '55555555-5555-4555-8555-555555555555';
const record = { condition: 'FAIR', purchase_price: 0, purchase_date: '2026-10-12', purchase_place: 'Feira', notes: 'Completo', is_favorite: true,
  box_set: { name: 'Clássicos', barcode: '001234567890', cover_url: 'https://covers.test/box.jpg', media_format: 'BLURAY',
    disc_count: 4, publisher: 'Warner', country: 'Brasil', region: 'A', video_standard: 'NTSC', edition_name: 'Coleção', is_special_edition: true, is_limited_edition: true,
    movies: [{ position: 2, movie: { id: m2, tmdb_id: null, title: 'Filme manual', poster_url: 'manual' } }, { position: 1, movie: { id: m1, tmdb_id: 10, title: 'Filme TMDB', poster_url: 'tmdb' } }],
  },
};
test('editing loads metadata and personal values without losing zero price or leading zeros', () => {
  const form = boxFormValues(record);
  const payload = parseBoxForm(form);
  assert.equal(form.price, '0'); assert.equal(form.barcode, '001234567890'); assert.equal(form.favorite, true);
  assert.equal(payload.box.name, 'Clássicos'); assert.equal(payload.box.video_standard, 'NTSC'); assert.equal(payload.box.media_format, 'BLURAY');
  assert.equal(payload.copy.purchase_price, 0); assert.equal(payload.copy.is_favorite, true); assert.equal(payload.copy.condition, 'FAIR');
  assert.equal(payload.box.cover_url, record.box_set.cover_url);
  assert.equal(payload.box.is_special_edition, true); assert.equal(payload.box.is_limited_edition, true);
});
test('clear/replace fields and toggle favorite remain separated into box and copy payloads', () => {
  const original = boxFormValues(record);
  const removed = parseBoxForm({ ...original, barcode: '', coverUrl: '', price: '', date: '', place: '', notes: '', videoStandard: null, favorite: false });
  assert.equal(removed.box.barcode, null); assert.equal(removed.box.cover_url, null); assert.equal(removed.box.video_standard, null);
  assert.equal(removed.copy.purchase_price, null); assert.equal(removed.copy.purchase_date, null); assert.equal(removed.copy.is_favorite, false);
  assert.equal('condition' in removed.box, false); assert.equal('edition_id' in removed.copy, false);
  assert.equal(parseBoxForm({ ...original, barcode: '0001234567890', coverUrl: 'https://covers.test/new.png', name: 'Novo nome' }).box.barcode, '0001234567890');
});
test('existing movies keep their UUID and ordering, including a movie with no TMDB ID', async () => {
  const selected = boxMovieSelection(record);
  assert.deepEqual(selected.map(movie => movie.id), ['10', `stored:${m2}`]);
  assert.deepEqual(await resolveBoxMovieIds(selected, async () => { throw new Error('Should not reload existing movies'); }), [m1, m2]);
});
test('adding/removing movies resolves only new selections and preserves explicit order', async () => {
  const old = boxMovieSelection(record); const seen = [];
  const selected = [old[1], { id: '30', title: 'Novo filme' }];
  const result = await resolveBoxMovieIds(selected, async movie => { seen.push(movie.id); return m3; });
  assert.deepEqual(seen, ['30']); assert.deepEqual(result, [m2, m3]);
  await assert.rejects(resolveBoxMovieIds([old[0], { id: '30' }], async () => m1), /diferentes/);
});
test('invalid selections reject before resolving movies; fresh box defaults remain optional', async () => {
  const selected = boxMovieSelection(record);
  for (const invalid of [[], [selected[0]], [selected[0], selected[0]], [{ id: '10' }, { id: 'bad' }], [{ id: '10', storedMovieId: 'bad' }, { id: '20' }]]) assert.throws(() => validateBoxSelection(invalid));
  await assert.rejects(resolveBoxMovieIds([], async () => { throw new Error('Unexpected network'); }), /Selecione/);
  const initial = boxFormValues(); assert.equal(initial.favorite, false); assert.equal(initial.mediaFormat, 'DVD'); assert.equal(initial.coverUrl, '');
});
