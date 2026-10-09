import assert from 'node:assert/strict';
import test from 'node:test';
import { parseDiscCount, parseEditionForm, discCountLabel } from '../src/services/collection/editionEditing.ts';
import { calendarDateToISO, calendarDateFromISO, displayCalendarDate } from '../src/utils/calendarDate.ts';
import { copyPhotoPath, isOwnCopyPhoto, validatePhotoBytes, MAX_PHOTO_BYTES } from '../src/services/photos/validation.ts';
import { saveCopyPhoto } from '../src/services/photos/lifecycle.ts';
import { collectionCover, parseCopyForm } from '../src/services/collection/mappers.ts';
const user = '11111111-1111-4111-8111-111111111111';
const item = '22222222-2222-4222-8222-222222222222';
const file = '33333333-3333-4333-8333-333333333333';
const photo = { uri: 'file:///photo.jpg', mime: 'image/jpeg' };
test('edition edits contain only edition fields; copy favorite/date stay separate', () => {
  const edition = parseEditionForm({ editionName: ' Especial ', publisher: ' ', country: ' Brasil ', region: '4', discCount: '2', customCoverUrl: null });
  assert.deepEqual(edition, { edition_name: 'Especial', publisher: null, country: 'Brasil', region: '4', disc_count: 2, custom_cover_url: null });
  const copy = parseCopyForm({ condition: 'GOOD', price: '', date: '2026-10-09', place: '', notes: '', favorite: true });
  assert.equal(copy.purchase_date, '2026-10-09'); assert.equal(copy.is_favorite, true);
  assert.equal('photo_url' in edition, false); assert.equal('edition_name' in copy, false);
});
test('disc count is optional or a positive database integer', () => {
  assert.equal(parseDiscCount(' '), null); assert.equal(parseDiscCount(' 2 '), 2);
  for (const value of ['0', '-1', '1.5', 'NaN', '2e3', '2147483648']) assert.throws(() => parseDiscCount(value));
  assert.equal(discCountLabel(null), null); assert.equal(discCountLabel(1), '1 disco'); assert.equal(discCountLabel(2), '2 discos');
});
test('calendar dates preserve chosen day in both positive and negative timezone offsets', () => {
  const original = process.env.TZ;
  try {
    for (const zone of ['America/Sao_Paulo', 'Pacific/Kiritimati', 'America/Los_Angeles']) {
      process.env.TZ = zone;
      assert.equal(calendarDateToISO(new Date(2026, 9, 9, 23, 30)), '2026-10-09');
      assert.equal(calendarDateToISO(calendarDateFromISO('2024-02-29')), '2024-02-29');
      assert.equal(displayCalendarDate('2026-10-09'), '09/10/2026');
    }
  } finally { if (original === undefined) delete process.env.TZ; else process.env.TZ = original; }
  for (const date of ['2025-02-29', '2026-13-01', '09/10/2026', '2026-00-01']) assert.throws(() => calendarDateFromISO(date));
});
test('photo names are scoped safe UUIDs and reject foreign owners/items/traversal', () => {
  const path = copyPhotoPath(user, item, file, 'image/jpeg');
  assert.equal(path, `${user}/${item}/photo-${file}.jpg`); assert.equal(isOwnCopyPhoto(path, user, item), true);
  assert.equal(isOwnCopyPhoto(path, file, item), false); assert.equal(isOwnCopyPhoto(path, user, file), false);
  assert.throws(() => copyPhotoPath('../', item, file, 'image/jpeg')); assert.throws(() => copyPhotoPath(user, item, file, 'text/html'));
});
test('photo validation checks actual signatures, MIME and byte size', () => {
  assert.equal(validatePhotoBytes(new Uint8Array([255,216,255,224]), 'image/jpeg'), 'image/jpeg');
  assert.equal(validatePhotoBytes(new Uint8Array([137,80,78,71,13,10,26,10]), 'image/png'), 'image/png');
  assert.equal(validatePhotoBytes(new TextEncoder().encode('RIFF0000WEBP'), 'image/webp'), 'image/webp');
  assert.throws(() => validatePhotoBytes(new TextEncoder().encode('<html>'), 'image/jpeg'));
  assert.throws(() => validatePhotoBytes(new Uint8Array([255,216,255]), 'image/png'));
  assert.throws(() => validatePhotoBytes(new Uint8Array(MAX_PHOTO_BYTES + 1), 'image/jpeg'));
});
test('replacement links the new object before deleting the previous one', async () => {
  const events = [];
  const result = await saveCopyPhoto('old', { action: 'replace', photo }, {
    upload: async () => { events.push('upload'); return 'new'; },
    persist: async path => { events.push(`link:${path}`); return { photo_url: path }; },
    remove: async path => { events.push(`remove:${path}`); },
  });
  assert.deepEqual(events, ['upload', 'link:new', 'remove:old']); assert.equal(result.saved.photo_url, 'new'); assert.equal(result.cleanupPending, false);
});
test('photo removal detaches first; keep never uploads or changes photo_url', async () => {
  for (const action of ['keep', 'remove']) {
    const events = [];
    await saveCopyPhoto('old', { action }, { upload: async () => { throw Error('unexpected upload'); }, persist: async path => { events.push(path); }, remove: async path => { events.push(path); } });
    assert.deepEqual(events, action === 'keep' ? [undefined] : [null, 'old']);
  }
});
test('failed linking cleans only the new upload and preserves original error', async () => {
  const events = []; const failure = new Error('conflict');
  await assert.rejects(saveCopyPhoto('old', { action: 'replace', photo }, { upload: async () => 'new', persist: async () => { throw failure; }, remove: async path => { events.push(path); throw new Error('RLS protects ambiguous linked object'); } }), error => error === failure);
  assert.deepEqual(events, ['new']);
});
test('cleanup failure never rolls back a successful replacement', async () => {
  const result = await saveCopyPhoto('old', { action: 'replace', photo }, { upload: async () => 'new', persist: async path => path, remove: async () => { throw Error('offline'); } });
  assert.deepEqual(result, { saved: 'new', cleanupPending: true });
});
test('personal photo does not enter catalog cover priority, clearing custom restores fallback', () => {
  const copy = { photo_url: 'private-photo-key', edition: { custom_cover_url: 'custom', product_image_url: 'product', movie: { poster_url: 'poster' } } };
  assert.equal(collectionCover(copy), 'custom'); copy.edition.custom_cover_url = null;
  assert.equal(collectionCover(copy), 'product'); copy.edition.product_image_url = null;
  assert.equal(collectionCover(copy), 'poster');
});
