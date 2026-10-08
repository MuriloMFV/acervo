import assert from 'node:assert/strict';
import test from 'node:test';
import { selectCollectionPreview, countCollectionFormats } from '../src/utils/collectionPreview.ts';

const items = [
  { id: '1', title: 'Pânico', year: 1996, poster: null, mediaFormat: 'DVD' },
  { id: '2', title: 'Alien', year: 1979, poster: null, mediaFormat: 'UHD_4K' },
  { id: '3', title: 'Pânico 2', year: 1997, poster: null, mediaFormat: 'BLURAY' },
];
const ids = (result) => result.map((item) => item.id);

test('title search ignores case; clearing restores the collection', () => {
  assert.deepEqual(ids(selectCollectionPreview(items, 'PÂNICO', 'ALL', 'RECENT')), ['1', '3']);
  assert.deepEqual(ids(selectCollectionPreview(items, '', 'ALL', 'RECENT')), ['1', '2', '3']);
});
test('search and format selection are applied together', () => {
  assert.deepEqual(ids(selectCollectionPreview(items, 'pânico', 'BLURAY', 'RECENT')), ['3']);
  assert.deepEqual(selectCollectionPreview(items, 'alien', 'DVD', 'RECENT'), []);
});
test('empty results and an empty collection are supported', () => {
  assert.deepEqual(selectCollectionPreview(items, 'inexistente', 'ALL', 'RECENT'), []);
  assert.deepEqual(selectCollectionPreview([], '', 'ALL', 'TITLE_ASC'), []);
});
test('all five sorting choices produce the expected order', () => {
  const expected = { RECENT: ['1', '2', '3'], TITLE_ASC: ['2', '1', '3'], TITLE_DESC: ['3', '1', '2'], YEAR_DESC: ['3', '1', '2'], YEAR_ASC: ['2', '1', '3'] };
  for (const [sort, order] of Object.entries(expected)) {
    assert.deepEqual(ids(selectCollectionPreview(items, '', 'ALL', sort)), order);
  }
});
test('sorting never mutates the mock source or its recent order', () => {
  const frozen = Object.freeze(items.map((item) => Object.freeze({ ...item })));
  selectCollectionPreview(frozen, '', 'ALL', 'TITLE_ASC');
  assert.deepEqual(ids(selectCollectionPreview(frozen, '', 'ALL', 'RECENT')), ['1', '2', '3']);
});
test('format counts include zeros and add up to the full collection', () => {
  assert.deepEqual(countCollectionFormats(items), { ALL: 3, DVD: 1, BLURAY: 1, UHD_4K: 1, VHS: 0 });
  assert.deepEqual(countCollectionFormats([]), { ALL: 0, DVD: 0, BLURAY: 0, UHD_4K: 0, VHS: 0 });
});
