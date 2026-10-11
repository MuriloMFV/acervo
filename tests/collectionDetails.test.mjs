import assert from 'node:assert/strict';
import test from 'node:test';
import { findCollectionItemDetails, formatPurchaseDate, formatPurchasePrice, formatRuntime, conditionLabels } from '../src/utils/collectionDetails.ts';

const sharedMovie = { title: 'Obra de exemplo' };
const copies = [
  { id: 'copy-dvd', movie: sharedMovie, edition: { mediaFormat: 'DVD' } },
  { id: 'copy-uhd', movie: sharedMovie, edition: { mediaFormat: 'UHD_4K' } },
];

test('lookup selects a copy id even when copies share the same movie', () => {
  assert.equal(findCollectionItemDetails(copies, 'copy-dvd'), copies[0]);
  assert.equal(findCollectionItemDetails(copies, 'copy-uhd'), copies[1]);
  assert.equal(findCollectionItemDetails(copies, 'Obra de exemplo'), undefined);
});
test('unknown, missing and ambiguous ids return no item', () => {
  for (const id of ['unknown', '', undefined, ['copy-dvd', 'copy-uhd']]) {
    assert.equal(findCollectionItemDetails(copies, id), undefined);
  }
});
test('missing purchase price is distinct from a price of zero', () => {
  assert.equal(formatPurchasePrice(null), '—');
  assert.equal(formatPurchasePrice(0).replace(/\s/g, ' '), 'R$ 0,00');
  assert.equal(formatPurchasePrice(49.9).replace(/\s/g, ' '), 'R$ 49,90');
});
test('acquisition date is a calendar date, without a timezone day shift', () => {
  assert.equal(formatPurchaseDate('2023-03-14'), '14/03/2023');
  assert.equal(formatPurchaseDate(null), '—');
  assert.equal(formatPurchaseDate('invalid'), '—');
});
test('runtime formats minutes and hours and accepts missing information', () => {
  assert.equal(formatRuntime(111), '1h 51min');
  assert.equal(formatRuntime(60), '1h');
  assert.equal(formatRuntime(45), '45min');
  assert.equal(formatRuntime(null), '—');
  assert.equal(formatRuntime(0), '—');
});
test('condition labels use the five agreed Portuguese names', () => {
  assert.deepEqual(Object.values(conditionLabels), ['Lacrado', 'Como novo', 'Muito bom', 'Bom', 'Ruim']);
});
