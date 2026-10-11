import assert from 'node:assert/strict';
import test from 'node:test';
import { packagingLabels, conditionLabels } from '../src/utils/collectionDetails.ts';
import { newEditionPayload, mapCollectionDetails, isStandardEdition } from '../src/services/collection/mappers.ts';
import { parseEditionForm } from '../src/services/collection/editionEditing.ts';
import { barcodeEditionPayload } from '../src/services/barcode/mappers.ts';

const form = { editionName: '', publisher: '', country: '', region: '', discCount: '', customCoverUrl: null };
const movie = { id: 'movie', title: 'Filme', genres: [], poster_url: 'poster', backdrop_url: null };
const edition = { id: 'edition', movie_id: movie.id, movie, media_format: 'DVD', packaging_type: 'STANDARD', barcode: null, publisher: null, region: null, country: null, edition_name: null, product_image_url: null, custom_cover_url: null, back_cover_url: null, is_special_edition: false, is_limited_edition: false, disc_count: null, release_year: null };
const item = { id: 'copy', edition, condition: 'FAIR', notes: 'Minha cópia', is_favorite: true };

test('cover types expose all six options in the requested order while FAIR still means Ruim', () => {
  assert.deepEqual(Object.values(packagingLabels), ['Case', 'Snapcase', 'Digipak', 'Steelbook', 'Luva', 'Box']);
  assert.equal(conditionLabels.FAIR, 'Ruim');
  assert.equal(packagingLabels.STANDARD, 'Case');
});
test('every cover type persists in creation and editing and remains visible in movie details', () => {
  for (const packagingType of Object.keys(packagingLabels)) {
    const manual = newEditionPayload(movie.id, 'DVD', { packagingType, country: 'Brasil', customCoverUrl: 'front', backCoverUrl: 'back' });
    assert.equal(manual.packaging_type, packagingType);
    assert.equal(manual.custom_cover_url, 'front');
    assert.equal(manual.back_cover_url, 'back');
    const edited = parseEditionForm({ ...form, packagingType });
    assert.equal(edited.packaging_type, packagingType);
    const mapped = mapCollectionDetails({ ...item, edition: { ...edition, ...manual } });
    assert.equal(mapped.edition.packagingType, packagingType);
    assert.equal(mapped.edition.country, 'Brasil');
    assert.equal(mapped.copy.condition, 'FAIR');
    assert.deepEqual(mapped.movie.poster, { uri: 'front' });
    assert.deepEqual(mapped.edition.backCover, { uri: 'back' });
    assert.equal(movie.poster_url, 'poster');
    assert.equal('barcode' in edited, false);
    assert.equal('poster_url' in edited, false);
    assert.equal('condition' in edited, false);
  }
});
test('legacy edit payloads omit cover type and new default editions remain Case', () => {
  assert.equal('packaging_type' in parseEditionForm(form), false);
  assert.equal(newEditionPayload(movie.id, 'DVD', {}).packaging_type, 'STANDARD');
  assert.equal(isStandardEdition(edition, movie.id, 'DVD'), true);
  for (const type of ['SNAPCASE', 'SLIPCASE']) assert.equal(isStandardEdition({ ...edition, packaging_type: type }, movie.id, 'DVD'), false);
});
test('invalid cover types are rejected before edition editing', () => {
  for (const packagingType of ['', 'OUTRO', null, 'toString']) {
    assert.throws(() => parseEditionForm({ ...form, packagingType }), /tipo de capa válido/);
  }
});
