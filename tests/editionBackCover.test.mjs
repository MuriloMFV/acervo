import assert from 'node:assert/strict';
import test from 'node:test';
import { editionCover, mapCollectionDetails, newEditionPayload, isStandardEdition } from '../src/services/collection/mappers.ts';
import { parseEditionForm } from '../src/services/collection/editionEditing.ts';
import { barcodeEditionPayload, assertSelectedCoverCompatible } from '../src/services/barcode/mappers.ts';
import { editionCoverPhotoPath, storedEditionCover } from '../src/services/covers/storage.ts';
import { saveEditionCoverPhoto } from '../src/services/covers/photoUpload.ts';
import { MAX_PHOTO_BYTES } from '../src/services/photos/validation.ts';
import { buildEditionBackCoverQuery, buildEditionCoverQuery } from '../src/services/covers/query.ts';
import { editionCoverFlipFaces } from '../src/utils/editionCoverFlip.ts';

const root = 'https://project.supabase.co/storage/v1/object/public/edition-covers/';
const owner = '11111111-1111-4111-8111-111111111111';
const back = `${root}${owner}/22222222-2222-4222-8222-222222222222.jpg`;
const replacement = back.replace('22222222-2222-4222-8222-222222222222.jpg', '33333333-3333-4333-8333-333333333333.webp');
const movie = { id: 'movie', title: 'Platoon', genres: [], poster_url: 'tmdb-poster', backdrop_url: null };
const edition = { id: 'edition', movie_id: movie.id, movie, media_format: 'DVD', packaging_type: 'STANDARD', barcode: null, publisher: null, region: null, country: null, edition_name: null, product_image_url: null, custom_cover_url: null, is_special_edition: false, is_limited_edition: false, disc_count: null, release_year: null };
const item = { id: 'copy', edition, condition: 'GOOD', notes: 'Minha cópia', is_favorite: true };
const form = { editionName: '', publisher: '', country: '', region: '', discCount: '', customCoverUrl: null };

test('details accept both a legacy Edition without the field and an explicitly empty back cover', () => {
  for (const value of [undefined, null, '', '   ']) {
    const result = mapCollectionDetails({ ...item, edition: { ...edition, back_cover_url: value } });
    assert.equal(result.edition.backCover, null);
    assert.deepEqual(result.movie.poster, { uri: movie.poster_url });
    assert.equal(result.copy.notes, item.notes);
  }
});
test('details expose the back independently without replacing the front, poster or copy values', () => {
  const withBack = { ...item, edition: { ...edition, custom_cover_url: 'front', back_cover_url: ` ${back} ` } };
  const result = mapCollectionDetails(withBack);
  assert.deepEqual(result.edition.backCover, { uri: back });
  assert.deepEqual(result.movie.poster, { uri: 'front' });
  assert.equal(result.copy.favorite, true);
  assert.equal(movie.poster_url, 'tmdb-poster');
});
test('back cover never participates in custom → product → movie front-cover priority', () => {
  const withBack = { ...edition, back_cover_url: back, custom_cover_url: 'custom', product_image_url: 'product' };
  assert.equal(editionCover(withBack), 'custom');
  assert.equal(editionCover({ ...withBack, custom_cover_url: null }), 'product');
  assert.equal(editionCover({ ...withBack, custom_cover_url: null, product_image_url: null }), 'tmdb-poster');
  assert.equal(editionCover({ ...edition, back_cover_url: back, movie: { ...movie, poster_url: null } }), null);
});
test('manual and barcode Edition payloads persist the back cover only on Edition', () => {
  const manual = newEditionPayload(movie.id, 'DVD', { customCoverUrl: 'front', backCoverUrl: back });
  assert.equal(manual.back_cover_url, back); assert.equal(manual.custom_cover_url, 'front');
  assert.equal(newEditionPayload(movie.id, 'DVD', {}).back_cover_url, null);
  const draft = { mediaFormat: 'DVD', packagingType: 'STANDARD', publisher: '', region: '', country: '', editionName: '', productImageUrl: 'product', customCoverUrl: 'front', isSpecialEdition: false, isLimitedEdition: false };
  const barcode = barcodeEditionPayload(movie.id, '7892770006398', { ...draft, backCoverUrl: back });
  assert.equal(barcode.back_cover_url, back); assert.equal(barcode.barcode, '7892770006398');
  assert.equal(barcode.product_image_url, 'product'); assert.equal(barcode.custom_cover_url, 'front');
  assert.equal('back_cover_url' in barcodeEditionPayload(movie.id, '7892770006398', draft), false);
  for (const payload of [manual, barcode]) {
    assert.equal('poster_url' in payload, false); assert.equal('photo_url' in payload, false);
    assert.equal('condition' in payload, false);
  }
});
test('edition form supports adding, replacing and removing back cover, preserving older payloads', () => {
  assert.equal('back_cover_url' in parseEditionForm(form), false);
  assert.equal(parseEditionForm({ ...form, backCoverUrl: back }).back_cover_url, back);
  assert.equal(parseEditionForm({ ...form, backCoverUrl: replacement }).back_cover_url, replacement);
  assert.equal(parseEditionForm({ ...form, backCoverUrl: null }).back_cover_url, null);
  assert.equal(parseEditionForm({ ...form, backCoverUrl: '  ' }).back_cover_url, null);
  assert.equal(parseEditionForm({ ...form, customCoverUrl: 'front', backCoverUrl: null }).custom_cover_url, 'front');
});
test('an Edition with a back cover is not reused as a blank standard edition', () => {
  assert.equal(isStandardEdition(edition, movie.id, 'DVD'), true);
  assert.equal(isStandardEdition({ ...edition, back_cover_url: null }, movie.id, 'DVD'), true);
  assert.equal(isStandardEdition({ ...edition, back_cover_url: back }, movie.id, 'DVD'), false);
});
test('back cover persistence accepts existing Storage objects URLs and rejects external hotlinks', () => {
  for (const suffix of ['jpg', 'png', 'webp']) assert.equal(storedEditionCover(back.replace(/jpg$/, suffix), root), back.replace(/jpg$/, suffix));
  assert.equal(storedEditionCover(` ${back} `, root), back);
  assert.equal(storedEditionCover(undefined, root), null); assert.equal(storedEditionCover(null, root), null);
  for (const value of ['https://example.com/back.jpg', back.replace('project.supabase.co', 'project.supabase.co.evil.test'), back.replace('edition-covers', 'copy-photos'), `${back}?token=external`, `${back}#fragment`, back.replace('.jpg', '.svg'), back.replace(owner, 'not-a-user'), back.replace('/22222222', '/extra/22222222'), back.replace('https://', 'https://user:pass@')]) {
    assert.throws(() => storedEditionCover(value, root), /salva pelo Acervo/, value);
  }
});
test('a racing shared Edition cannot silently discard a selected back cover', () => {
  assert.doesNotThrow(() => assertSelectedCoverCompatible({ ...edition, back_cover_url: back }, null, back));
  assert.doesNotThrow(() => assertSelectedCoverCompatible({ ...edition, back_cover_url: back }, null, null));
  assert.throws(() => assertSelectedCoverCompatible({ ...edition, back_cover_url: null }, null, back), /Consulte novamente/);
  assert.throws(() => assertSelectedCoverCompatible({ ...edition, back_cover_url: back }, null, replacement), /Consulte novamente/);
});
test('back search specifies contracapa and keeps the existing front search unchanged and bounded', () => {
  const params = { title: 'Platoon', mediaFormat: 'DVD', barcode: '7890552001548', country: 'Brasil' };
  assert.equal(buildEditionCoverQuery(params), '7890552001548 Platoon DVD Brasil capa');
  assert.equal(buildEditionBackCoverQuery(params), '7890552001548 Platoon DVD Brasil contracapa');
  const longQuery = buildEditionBackCoverQuery({ ...params, title: 'X'.repeat(400) });
  assert.ok(longQuery.length <= 240); assert.ok(longQuery.endsWith(' contracapa'));
});
test('flip exposes one face at a time and the back endpoint is readable at 360°, in both directions', () => {
  for (const progress of [0, 0.25, 0.5, 0.75, 1, 0.75, 0.25, 0]) {
    const faces = editionCoverFlipFaces(progress);
    assert.equal(faces.frontOpacity + faces.backOpacity, 1);
    assert.equal(faces.backOpacity, progress >= 0.5 ? 1 : 0);
  }
  assert.equal(editionCoverFlipFaces(0).frontAngle, '0deg');
  assert.equal(editionCoverFlipFaces(1).backAngle, '360deg');
  assert.equal(editionCoverFlipFaces(-1).frontAngle, '0deg');
  assert.equal(editionCoverFlipFaces(2).backAngle, '360deg');
});

const photo = { uri: 'file:///back.jpg', mime: 'image/jpeg' };
const fileId = '22222222-2222-4222-8222-222222222222';
const jpeg = new Uint8Array([255, 216, 255, 224]).buffer;
function uploadOperations(overrides = {}) {
  return {
    currentUserId: async () => owner, readFile: async () => jpeg, createId: () => fileId,
    upload: async () => {}, publicUrl: path => `${root}${path}`, bucketUrl: root, ...overrides,
  };
}
test('a photo from camera or gallery uploads to the existing cover bucket and returns a permanent URL', async () => {
  const events = [];
  const url = await saveEditionCoverPhoto(owner, photo, uploadOperations({
    readFile: async uri => { events.push(`read:${uri}`); return jpeg; },
    upload: async (path, buffer, mime) => { events.push(`upload:${path}`); assert.equal(buffer, jpeg); assert.equal(mime, 'image/jpeg'); },
    publicUrl: path => { events.push(`url:${path}`); return `${root}${path}`; },
  }));
  assert.equal(url, back);
  assert.deepEqual(events, [`read:${photo.uri}`, `upload:${owner}/${fileId}.jpg`, `url:${owner}/${fileId}.jpg`]);
  assert.equal(url.startsWith('file:'), false);
});
test('local contracapa rejects invalid bytes, MIME mismatch, empty and oversized images before upload', async () => {
  for (const [buffer, mime] of [[new TextEncoder().encode('<html>').buffer, 'image/jpeg'], [jpeg, 'image/png'], [new ArrayBuffer(0), 'image/jpeg'], [new ArrayBuffer(MAX_PHOTO_BYTES + 1), 'image/jpeg']]) {
    let uploads = 0;
    await assert.rejects(saveEditionCoverPhoto(owner, { ...photo, mime }, uploadOperations({ readFile: async () => buffer, upload: async () => { uploads++; } })));
    assert.equal(uploads, 0);
  }
});
test('a failed local upload never produces a selectable cover URL or changes the previous image', async () => {
  let selected = replacement;
  let publicUrls = 0;
  await assert.rejects(async () => {
    selected = await saveEditionCoverPhoto(owner, photo, uploadOperations({
      upload: async () => { throw new Error('upload failed'); },
      publicUrl: () => { publicUrls++; return back; },
    }));
  }, /upload failed/);
  assert.equal(selected, replacement); assert.equal(publicUrls, 0);
});
test('changed sessions cannot upload or attach another user’s local contracapa', async () => {
  for (const changedAt of [1, 2, 3]) {
    let reads = 0, uploads = 0;
    await assert.rejects(saveEditionCoverPhoto(owner, photo, uploadOperations({
      currentUserId: async () => ++reads >= changedAt ? fileId : owner,
      upload: async () => { uploads++; },
    })), /Sessão alterada/);
    assert.equal(uploads, changedAt === 3 ? 1 : 0);
  }
});
test('photo paths are owned UUIDs with supported extensions and uploaded URLs must match Storage', async () => {
  for (const [mime, extension] of [['image/jpeg', 'jpg'], ['image/png', 'png'], ['image/webp', 'webp']]) {
    assert.equal(editionCoverPhotoPath(owner, fileId, mime), `${owner}/${fileId}.${extension}`);
  }
  assert.throws(() => editionCoverPhotoPath('../', fileId, 'image/jpeg'));
  assert.throws(() => editionCoverPhotoPath(owner, fileId, 'image/svg+xml'));
  await assert.rejects(saveEditionCoverPhoto(owner, photo, uploadOperations({ publicUrl: () => 'https://external.test/back.jpg' })), /salva pelo Acervo/);
});
test('an uploaded front photo edits custom_cover_url while keeping the back and movie poster intact', async () => {
  const frontPhoto = await saveEditionCoverPhoto(owner, { ...photo, uri: 'file:///front.jpg' }, uploadOperations());
  const fields = parseEditionForm({ ...form, customCoverUrl: frontPhoto, backCoverUrl: replacement });
  assert.equal(fields.custom_cover_url, frontPhoto); assert.equal(fields.back_cover_url, replacement);
  const saved = { ...edition, ...fields, product_image_url: 'product' };
  const details = mapCollectionDetails({ ...item, edition: saved });
  assert.deepEqual(details.movie.poster, { uri: frontPhoto });
  assert.deepEqual(details.edition.backCover, { uri: replacement });
  assert.equal(saved.movie.poster_url, movie.poster_url);
  const restored = { ...saved, ...parseEditionForm({ ...form, customCoverUrl: null, backCoverUrl: replacement }) };
  assert.equal(editionCover(restored), 'product'); assert.equal(restored.back_cover_url, replacement);
});
