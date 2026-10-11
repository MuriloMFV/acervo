import assert from 'node:assert/strict';
import test from 'node:test';
import { countries } from '../src/data/countries.ts';
import { countryFlag, countryName, findCountry, searchCountries } from '../src/utils/countries.ts';
import { packagingLabels, conditionLabels } from '../src/utils/collectionDetails.ts';
import { newEditionPayload, mapCollectionDetails, isStandardEdition } from '../src/services/collection/mappers.ts';
import { parseEditionForm } from '../src/services/collection/editionEditing.ts';
import { barcodeEditionPayload } from '../src/services/barcode/mappers.ts';

const form = { editionName: '', publisher: '', country: '', region: '', discCount: '', customCoverUrl: null };
const movie = { id: 'movie', title: 'Filme', genres: [], poster_url: 'poster', backdrop_url: null };
const edition = { id: 'edition', movie_id: movie.id, movie, media_format: 'DVD', packaging_type: 'STANDARD', barcode: null, publisher: null, region: null, country: null, edition_name: null, product_image_url: null, custom_cover_url: null, back_cover_url: null, is_special_edition: false, is_limited_edition: false, disc_count: null, release_year: null };
const item = { id: 'copy', edition, condition: 'FAIR', notes: 'Minha cópia', is_favorite: true };

test('country catalog uses unique ISO codes, with a flag and Portuguese label for every option', () => {
  assert.equal(countries.length, 249);
  assert.equal(new Set(countries.map(country => country.code)).size, countries.length);
  for (const country of countries) {
    assert.match(country.code, /^[A-Z]{2}$/);
    assert.ok(country.name);
    assert.equal(findCountry(country.code), country);
    assert.equal(findCountry(country.name), country);
    assert.equal([...countryFlag(country.code)].length, 2);
  }
});
test('country display recognizes existing names and ISO/English aliases without changing saved data', () => {
  for (const value of ['Brasil', ' brasil ', 'BR', 'BRA', 'Brazil']) {
    assert.equal(countryName(value), 'Brasil');
    assert.equal(findCountry(value).code, 'BR');
  }
  assert.equal(countryFlag('BR'), '🇧🇷');
  assert.equal(countryFlag('US'), '🇺🇸');
  assert.equal(countryFlag('JP'), '🇯🇵');
  assert.equal(findCountry('EUA').code, 'US');
  assert.equal(findCountry('UK').code, 'GB');
  assert.equal(findCountry('République desconhecida'), null);
});
test('country search ignores accents, accepts names or codes and returns no invented results', () => {
  assert.equal(searchCountries('Japao')[0].code, 'JP');
  assert.equal(searchCountries('EUA')[0].code, 'US');
  assert.equal(searchCountries('united states')[0].code, 'US');
  assert.ok(searchCountries('amer').some(country => country.code === 'AS'));
  assert.equal(searchCountries('').length, countries.length);
  assert.deepEqual(searchCountries('país que não existe'), []);
});
test('missing and unrecognized legacy countries keep a safe display without a false flag', () => {
  for (const value of [null, undefined, '', '   ']) {
    assert.equal(countryName(value), '');
    assert.equal(findCountry(value), null);
  }
  assert.equal(countryName('  Importação antiga  '), 'Importação antiga');
  assert.equal(countryFlag('Importação antiga'), '');
  assert.equal(countryFlag('XX'), '');
});
test('selected country is persisted as its existing text field in manual, barcode and edit payloads', () => {
  const country = findCountry('JP').name;
  assert.equal(country, 'Japão');
  assert.equal(newEditionPayload(movie.id, 'DVD', { country }).country, country);
  assert.equal(parseEditionForm({ ...form, country }).country, country);
  const draft = { mediaFormat: 'DVD', packagingType: 'STANDARD', publisher: '', region: '', country, editionName: '', productImageUrl: null, isSpecialEdition: false, isLimitedEdition: false };
  assert.equal(barcodeEditionPayload(movie.id, '7892770006398', draft).country, country);
  assert.equal(parseEditionForm({ ...form, country: '' }).country, null);
  assert.equal(parseEditionForm({ ...form, country: 'Importação antiga' }).country, 'Importação antiga');
});
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
