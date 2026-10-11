import assert from 'node:assert/strict';
import test from 'node:test';
import { distributors } from '../src/data/distributors.ts';
import { distributorName, findDistributor, searchDistributors } from '../src/utils/distributors.ts';
import { newEditionPayload, mapCollectionDetails } from '../src/services/collection/mappers.ts';
import { parseEditionForm } from '../src/services/collection/editionEditing.ts';
import { barcodeEditionPayload } from '../src/services/barcode/mappers.ts';
import { parseBoxForm } from '../src/services/boxes/mappers.ts';
import { distributorSvgLogos } from '../src/assets/distribuidoras/native.ts';
import { readFileSync } from 'node:fs';

const form = { editionName: '', publisher: '', country: '', region: '', discCount: '', customCoverUrl: null };
const barcodeDraft = { mediaFormat: 'DVD', packagingType: 'STANDARD', publisher: '', country: '', region: '', editionName: '', productImageUrl: null, isSpecialEdition: false, isLimitedEdition: false };
const boxForm = { name: 'Meu box', mediaFormat: 'DVD', barcode: '', coverUrl: '', editionName: '', publisher: '', country: '', region: '', discCount: '', special: false, limited: false, condition: 'GOOD', price: '', date: '', place: '', notes: '' };

test('distributor lookup recognizes listed names and explicit legacy aliases', () => {
  assert.equal(distributors.length, 15);
  assert.equal(new Set(distributors.map(item => item.id)).size, 15);
  for (const item of distributors) {
    assert.equal(findDistributor(item.name), item);
    for (const alias of item.aliases) assert.equal(findDistributor(alias), item);
  }
  assert.equal(findDistributor('  playarte  ').id, 'playarte');
  assert.equal(findDistributor('Metro Goldwyn Mayer').id, 'mgm');
  assert.equal(distributorName('20th Century Fox Home Entertainment'), '20th Century Fox');
  assert.equal(distributorName('Warner Home Video'), 'Warner Bros.');
  assert.equal(findDistributor('Warner Bros Home Entertainment').id, 'warner');
  assert.equal(distributorName('Sony'), 'Sony Pictures Home Entertainment');
  assert.equal(findDistributor('SPHE').id, 'sony');
  assert.notEqual(findDistributor('Sony').id, findDistributor('Columbia Pictures').id);
});

test('distributor search handles partial names, accents and empty/no-match queries', () => {
  assert.deepEqual(searchDistributors(''), distributors);
  assert.equal(searchDistributors('páramount')[0].id, 'paramount');
  assert.equal(searchDistributors('goldwyn')[0].id, 'mgm');
  assert.equal(searchDistributors('touch')[0].id, 'touchstone');
  assert.equal(searchDistributors('warner')[0].id, 'warner');
  assert.equal(searchDistributors('sony')[0].id, 'sony');
  assert.deepEqual(searchDistributors('Não existe esta marca'), []);
});

test('missing, custom and combined distributor names have no inferred logo', () => {
  for (const name of [null, undefined, '', '   ']) {
    assert.equal(findDistributor(name), null);
    assert.equal(distributorName(name), '');
  }
  for (const name of ['Outra Distribuidora', 'Disney / Sony', 'Universal Importação', 'Sony / Warner']) {
    assert.equal(findDistributor(name), null);
    assert.equal(distributorName(` ${name} `), name);
  }
});

test('listed and manual distributor text persists through manual, barcode and edition editing', () => {
  for (const publisher of [...distributors.map(item => item.name), 'Versátil Home Video', 'Distribuidora antiga']) {
    const input = ` ${publisher} `;
    assert.equal(newEditionPayload('movie', 'DVD', { publisher: input }).publisher, publisher);
    assert.equal(barcodeEditionPayload('movie', '7892770006398', { ...barcodeDraft, publisher: input }).publisher, publisher);
    assert.equal(parseEditionForm({ ...form, publisher: input }).publisher, publisher);
    assert.equal(parseBoxForm({ ...boxForm, publisher: input }).box.publisher, publisher);
  }
  assert.equal(parseEditionForm({ ...form, publisher: 'x'.repeat(200) }).publisher.length, 200);
  assert.throws(() => parseEditionForm({ ...form, publisher: 'x'.repeat(201) }), /200 caracteres/);
});

test('changing or clearing distributor preserves unrelated edition metadata and cover priority', () => {
  const original = { ...form, publisher: 'Distribuidora antiga', country: 'BR', region: '4', videoStandard: 'NTSC', discCount: '2', customCoverUrl: 'storage/front.jpg', backCoverUrl: 'storage/back.jpg', packagingType: 'STEELBOOK' };
  const parsed = parseEditionForm(original);
  for (const publisher of ['Miramax', 'Nome manual', '']) {
    const updated = parseEditionForm({ ...original, publisher });
    assert.equal(updated.publisher, publisher || null);
    const { publisher: _publisher, ...other } = updated;
    const { publisher: _previous, ...previous } = parsed;
    assert.deepEqual(other, previous);
  }
  assert.equal(newEditionPayload('movie', 'DVD', { publisher: '' }).publisher, null);
  assert.equal(barcodeEditionPayload('movie', '7892770006398', barcodeDraft).publisher, null);
  const movie = { title: 'Filme', genres: [], poster_url: 'poster.jpg', backdrop_url: null };
  const edition = { movie, media_format: 'DVD', publisher: null, custom_cover_url: 'front.jpg', product_image_url: 'product.jpg' };
  for (const publisher of [null, 'BBC', 'Nome antigo', '']) {
    const details = mapCollectionDetails({ id: 'copy', edition: { ...edition, publisher }, condition: 'GOOD' });
    assert.equal(details.edition.publisher, publisher);
    assert.equal(details.movie.poster.uri, 'front.jpg');
    assert.doesNotThrow(() => distributorName(details.edition.publisher));
  }
});

test('native vector adaptation keeps drawable artwork and extracts Disney PNG unchanged', () => {
  assert.deepEqual(Object.keys(distributorSvgLogos).sort(), ['bbc', 'fox', 'marvel', 'miramax', 'sony', 'universal', 'warner']);
  for (const xml of Object.values(distributorSvgLogos)) {
    assert.match(xml, /^<svg /);
    assert.match(xml, /viewBox=/);
    assert.match(xml, /<path /);
    assert.doesNotMatch(xml, /<(?:metadata|namedview|style|defs|pattern)|\sclass=/);
  }
  const original = readFileSync(new URL('../src/assets/distribuidoras/walt-disney-home-entertainment-logo-png_seeklogo-151334.svg', import.meta.url), 'utf8');
  const encoded = original.match(/data:image\/png;base64,([^"\s]+)/)[1];
  assert.deepEqual(readFileSync(new URL('../src/assets/distribuidoras/disney-native.png', import.meta.url)), Buffer.from(encoded, 'base64'));
});
