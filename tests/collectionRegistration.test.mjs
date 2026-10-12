import assert from 'node:assert/strict';
import test from 'node:test';
import { prepareCollectionRegistration, persistCollectionRegistration } from '../src/services/collection/registration.ts';
import { copyPayload, moviePayload, newEditionPayload } from '../src/services/collection/mappers.ts';
import { barcodeEditionPayload, coverCorrectionNote } from '../src/services/barcode/mappers.ts';

const movie = { id: '4232', title: 'Pânico', originalTitle: 'Scream', year: 1996, overview: 'Sinopse', runtime: 111, posterUrl: 'poster', backdropUrl: 'backdrop', director: 'Wes Craven', genres: ['Terror'] };
const edition = { packagingType: 'STEELBOOK', barcode: ' 0012-3456-78905 ', customCoverUrl: 'front', backCoverUrl: 'back', publisher: ' Sony ', country: ' Brasil ', region: ' A ', videoStandard: 'NTSC', discCount: '2', editionName: ' Especial ', isSpecialEdition: true, isLimitedEdition: true };
const copy = { price: '88,90', date: '2026-10-12', place: ' Loja ', notes: ' Minha cópia\ncompleta ', favorite: true };

test('complete registration separates every edition and copy field with existing normalization', () => {
  const prepared = prepareCollectionRegistration('BLURAY', 'VERY_GOOD', edition, copy);
  assert.deepEqual(prepared.edition, { edition_name: 'Especial', publisher: 'Sony', country: 'Brasil', region: 'A', disc_count: 2, custom_cover_url: 'front', back_cover_url: 'back', packaging_type: 'STEELBOOK', video_standard: 'NTSC', barcode: '0012345678905', media_format: 'BLURAY', product_image_url: null, is_special_edition: true, is_limited_edition: true });
  assert.deepEqual(prepared.copy, { condition: 'VERY_GOOD', purchase_price: 88.9, purchase_date: '2026-10-12', purchase_place: 'Loja', notes: 'Minha cópia\ncompleta', is_favorite: true });
  assert.deepEqual(newEditionPayload('movie-id', 'BLURAY', edition), { ...prepared.edition, movie_id: 'movie-id' });
  for (const key of Object.keys(prepared.copy)) assert.equal(key in prepared.edition, false);
  for (const key of Object.keys(prepared.edition)) assert.equal(key in prepared.copy, false);
});

test('optional data can all be skipped for DVD, Blu-ray, 4K and VHS', () => {
  for (const format of ['DVD', 'BLURAY', 'UHD_4K', 'VHS']) {
    const prepared = prepareCollectionRegistration(format, 'GOOD');
    assert.equal(prepared.edition.media_format, format);
    assert.equal(prepared.edition.packaging_type, 'STANDARD');
    for (const key of ['barcode', 'disc_count', 'edition_name', 'publisher', 'country', 'region', 'custom_cover_url', 'back_cover_url']) assert.equal(prepared.edition[key], null);
    assert.equal(prepared.edition.is_special_edition, false);
    assert.equal(prepared.edition.is_limited_edition, false);
    assert.deepEqual(prepared.copy, { condition: 'GOOD', purchase_price: null, purchase_date: null, purchase_place: null, notes: null, is_favorite: false });
  }
  const blanks = prepareCollectionRegistration('DVD', 'GOOD', { barcode: '', discCount: '', editionName: ' ', publisher: '', country: '', region: '', videoStandard: null }, { price: '', date: '', place: ' ', notes: '', favorite: false });
  assert.equal(blanks.edition.barcode, null);
  assert.equal(blanks.edition.video_standard, null);
  assert.equal(blanks.copy.purchase_place, null);
});

test('zero price and leading zero barcode are preserved in the first save', () => {
  const prepared = prepareCollectionRegistration('DVD', 'FAIR', { barcode: '012345678905', discCount: '1' }, { price: '0,00' });
  assert.equal(prepared.edition.barcode, '012345678905');
  assert.equal(prepared.edition.disc_count, 1);
  assert.equal(copyPayload('owner', 'edition', 'FAIR', prepared.copy).purchase_price, 0);
});

test('invalid optional fields reuse edition/copy validation before persistence', () => {
  for (const [editionChange, copyChange, message] of [
    [{ barcode: '123' }, {}, /Código inválido/],
    [{ discCount: '0' }, {}, /número inteiro de discos/],
    [{ discCount: '1.5' }, {}, /número inteiro de discos/],
    [{ packagingType: 'OTHER' }, {}, /tipo de capa válido/],
    [{ videoStandard: 'OTHER' }, {}, /codificação válida/],
    [{ editionName: 'x'.repeat(201) }, {}, /200 caracteres/],
    [{}, { price: '-1' }, /Preço inválido/],
    [{}, { date: '2026-02-30' }, /Data inválida/],
  ]) assert.throws(() => prepareCollectionRegistration('DVD', 'GOOD', editionChange, copyChange), message);
});

test('save order links Movie to Edition to CollectionItem and never mixes their data', async () => {
  const original = structuredClone(movie);
  const prepared = prepareCollectionRegistration('BLURAY', 'VERY_GOOD', edition, copy);
  const calls = [];
  const result = await persistCollectionRegistration(movie, prepared, {
    movie: async value => { calls.push('Movie'); assert.equal(value, movie); assert.equal(moviePayload(value).poster_url, 'poster'); return { id: 'saved-movie' }; },
    edition: async (id, fields) => { calls.push('Edition'); assert.equal(id, 'saved-movie'); assert.deepEqual(fields, prepared.edition); return { id: 'saved-edition' }; },
    copy: async (id, fields) => { calls.push('CollectionItem'); assert.equal(id, 'saved-edition'); assert.deepEqual(fields, prepared.copy); return { id: 'saved-copy' }; },
  });
  assert.deepEqual(calls, ['Movie', 'Edition', 'CollectionItem']);
  assert.deepEqual(result, { id: 'saved-copy' });
  assert.deepEqual(movie, original);
  for (const key of [...Object.keys(prepared.edition), ...Object.keys(prepared.copy)]) assert.equal(key in moviePayload(movie), false);
});

test('failure saving an edition prevents the copy from being created', async () => {
  const calls = [];
  await assert.rejects(persistCollectionRegistration(movie, prepareCollectionRegistration('DVD', 'GOOD'), {
    movie: async () => { calls.push('Movie'); return { id: 'movie' }; },
    edition: async () => { calls.push('Edition'); throw new Error('offline'); },
    copy: async () => { assert.fail('copy must wait for the edition'); },
  }), /offline/);
  assert.deepEqual(calls, ['Movie', 'Edition']);
});

test('copy payload always keeps the authenticated owner and chosen edition link', () => {
  const prepared = prepareCollectionRegistration('DVD', 'SEALED', {}, copy);
  const payload = copyPayload('owner', 'edition', 'SEALED', { ...prepared.copy, user_id: 'other', edition_id: 'other', barcode: '96385074' });
  assert.equal(payload.user_id, 'owner');
  assert.equal(payload.edition_id, 'edition');
  assert.equal(payload.is_favorite, true);
  assert.equal('barcode' in payload, false);
});

test('barcode flow keeps its existing edition and default copy payloads/correction note', () => {
  const payload = barcodeEditionPayload('movie', '7892770006398', { mediaFormat: 'DVD', packagingType: 'STANDARD', publisher: '', country: '', region: '', editionName: '', productImageUrl: 'product', isSpecialEdition: false, isLimitedEdition: false });
  assert.equal(payload.barcode, '7892770006398');
  assert.equal(payload.product_image_url, 'product');
  assert.deepEqual(copyPayload('owner', 'edition', 'GOOD'), { user_id: 'owner', edition_id: 'edition', condition: 'GOOD', is_favorite: false, purchase_price: null, purchase_date: null, purchase_place: null, notes: null });
  assert.equal(coverCorrectionNote, 'Capa da edição marcada para correção.');
});
