import assert from 'node:assert/strict';
import test from 'node:test';
import { collectionCover, mapCollectionCard, mapCollectionDetails, moviePayload, editionPayload, copyPayload, isStandardEdition, isCollectionItemId, parseCopyForm } from '../src/services/collection/mappers.ts';
import { reuseOrCreate } from '../src/services/collection/reuse.ts';
import { conditionLabels } from '../src/utils/collectionDetails.ts';

const movie = { id: 'movie-id', tmdb_id: 4232, title: 'Pânico', original_title: 'Scream', release_year: 1996, overview: 'Sinopse', runtime: 111, poster_url: 'https://example.test/poster.jpg', backdrop_url: null, director: 'Wes Craven', genres: ['Terror'], created_at: '', updated_at: '' };
const edition = { id: 'edition-id', movie_id: movie.id, media_format: 'BLURAY', packaging_type: 'STANDARD', barcode: null, publisher: null, region: null, country: null, edition_name: null, product_image_url: null, custom_cover_url: null, is_special_edition: false, is_limited_edition: false, disc_count: null, release_year: null, created_at: '', updated_at: '', movie };
const copy = { id: 'copy-id', user_id: 'owner', edition_id: edition.id, condition: 'GOOD', purchase_price: null, purchase_date: null, purchase_place: null, is_favorite: false, notes: null, created_at: '', updated_at: '', edition };

test('detail lookup accepts UUIDs and rejects malformed route ids', () => {
  assert.equal(isCollectionItemId('b1426b40-99ce-4fa0-98cb-d7708f54fa97'), true);
  for (const id of ['', '4232', 'copy-id', 'invalid']) assert.equal(isCollectionItemId(id), false);
});

test('cover prefers custom, then product, then movie, without inventing an image', () => {
  const item = { ...copy, edition: { ...edition, custom_cover_url: ' custom ', product_image_url: ' product ' } };
  assert.equal(collectionCover(item), 'custom');
  item.edition.custom_cover_url = ' ';
  assert.equal(collectionCover(item), 'product');
  item.edition.product_image_url = null;
  assert.equal(collectionCover(item), movie.poster_url);
  item.edition.movie = { ...movie, poster_url: null };
  assert.equal(collectionCover(item), null);
});
test('card uses the copy id, movie data and edition format', () => {
  assert.deepEqual(mapCollectionCard(copy), { id: 'copy-id', title: 'Pânico', year: 1996, poster: { uri: movie.poster_url }, mediaFormat: 'BLURAY' });
  assert.equal(mapCollectionCard({ ...copy, edition: { ...edition, movie: { ...movie, release_year: null } } }).year, null);
});
test('detail mapper preserves actual copy values, zero price and missing metadata', () => {
  const result = mapCollectionDetails({ ...copy, purchase_price: 0, is_favorite: true, notes: 'Minha cópia' });
  assert.equal(result.id, copy.id);
  assert.equal(result.copy.purchasePrice, 0);
  assert.equal(result.copy.favorite, true);
  assert.equal(result.copy.notes, 'Minha cópia');
  assert.equal(result.edition.barcode, null);
  assert.equal(result.movie.backdrop, null);
  assert.deepEqual(result.movie.genres, ['Terror']);
});
test('movie creation payload preserves all available TMDB details', () => {
  const result = moviePayload({ id: '4232', title: 'Pânico', originalTitle: 'Scream', year: 1996, posterUrl: movie.poster_url, backdropUrl: null, overview: 'Sinopse', runtime: 111, director: 'Wes Craven', genres: ['Terror'] });
  assert.deepEqual(result, { tmdb_id: 4232, title: 'Pânico', original_title: 'Scream', release_year: 1996, poster_url: movie.poster_url, backdrop_url: null, overview: 'Sinopse', runtime: 111, director: 'Wes Craven', genres: ['Terror'] });
  assert.throws(() => moviePayload({ id: 'not-a-tmdb-id' }), /inválido/);
});
test('minimal edition and copy payloads keep ownership and optional data explicit', () => {
  assert.deepEqual(editionPayload('movie-id', 'UHD_4K'), { movie_id: 'movie-id', media_format: 'UHD_4K', packaging_type: 'STANDARD', is_special_edition: false, is_limited_edition: false, barcode: null, product_image_url: null, custom_cover_url: null });
  assert.deepEqual(copyPayload('user-id', 'edition-id', 'SEALED'), { user_id: 'user-id', edition_id: 'edition-id', condition: 'SEALED', is_favorite: false, purchase_price: null, purchase_date: null, purchase_place: null, notes: null });
});
test('compatible editions require same movie and format and no specific packaging or product data', () => {
  assert.equal(isStandardEdition(edition, movie.id, 'BLURAY'), true);
  assert.equal(isStandardEdition(edition, 'other-movie', 'BLURAY'), false);
  assert.equal(isStandardEdition(edition, movie.id, 'DVD'), false);
  for (const overrides of [{ packaging_type: 'STEELBOOK' }, { is_special_edition: true }, { is_limited_edition: true }, { barcode: '123' }, { custom_cover_url: 'cover' }, { publisher: 'Distribuidora' }]) {
    assert.equal(isStandardEdition({ ...edition, ...overrides }, movie.id, 'BLURAY'), false);
  }
});
test('all persisted conditions map to Portuguese labels', () => {
  assert.deepEqual(conditionLabels, { SEALED: 'Lacrado', LIKE_NEW: 'Como novo', VERY_GOOD: 'Muito bom', GOOD: 'Bom', FAIR: 'Ruim' });
});
test('editing parses decimal comma, zero, real calendar date and optional fields', () => {
  const form = { condition: 'LIKE_NEW', price: ' 12,50 ', date: '2024-02-29', place: ' Loja ', notes: ' Nota ' };
  assert.deepEqual(parseCopyForm(form), { condition: 'LIKE_NEW', purchase_price: 12.5, purchase_date: '2024-02-29', purchase_place: 'Loja', notes: 'Nota' });
  assert.equal(parseCopyForm({ ...form, price: '0' }).purchase_price, 0);
  assert.deepEqual(parseCopyForm({ ...form, price: '', date: '', place: ' ', notes: '' }), { condition: 'LIKE_NEW', purchase_price: null, purchase_date: null, purchase_place: null, notes: null });
  for (const price of ['-1', 'NaN', '1.234', '10000000000', '1e3']) assert.throws(() => parseCopyForm({ ...form, price }), /Preço/);
  for (const date of ['2023-02-29', '2024-13-01', '29/02/2024', '0000-01-01']) assert.throws(() => parseCopyForm({ ...form, date }), /Data/);
});
test('existing Movie or Edition is reused without INSERT or UPDATE', async () => {
  for (const existing of [movie, edition]) {
    assert.equal(await reuseOrCreate({ find: async () => existing, insert: async () => { throw new Error('Unexpected insertion'); } }), existing);
  }
});
test('absent Movie or Edition is inserted once', async () => {
  for (const created of [movie, edition]) {
    let inserts = 0;
    assert.equal(await reuseOrCreate({ find: async () => null, insert: async () => { inserts++; return created; } }), created);
    assert.equal(inserts, 1);
  }
});
test('Movie unique race rereads and reuses the winner', async () => {
  let reads = 0;
  assert.equal(await reuseOrCreate({ retryUnique: true, find: async () => ++reads === 1 ? null : movie, insert: async () => { throw { code: '23505' }; } }), movie);
  assert.equal(reads, 2);
});
test('catalog errors are not hidden and a failed unique reread still fails', async () => {
  for (const code of ['42501', '23505']) {
    await assert.rejects(reuseOrCreate({ retryUnique: true, find: async () => null, insert: async () => { throw { code }; } }), (error) => error.code === code);
  }
});
