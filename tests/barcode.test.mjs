import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { normalizeBarcode, isValidBarcode, validatedBarcode, barcodeAliases, inferMediaFormat, productMovieQuery } from '../src/utils/barcode.ts';
import { mapUpcProduct, mapUpcResponse, safeProductImage } from '../src/services/upc/mappers.ts';
import { lookupBarcode } from '../src/services/upc/products.ts';
import { upcGet, UpcError } from '../src/services/upc/client.ts';
import { resolveBarcode } from '../src/services/barcode/lookup.ts';
import { assertCompatibleEdition, barcodeEditionPayload } from '../src/services/barcode/mappers.ts';
import { editionCover } from '../src/services/collection/mappers.ts';

const fixtures = JSON.parse(readFileSync(new URL('./fixtures/upc.json', import.meta.url), 'utf8'));
const code = '012345678905';

test('barcode normalization removes formatting and keeps all leading zeroes as string', () => {
  assert.equal(normalizeBarcode(' 0 123-456.78905\n'), code);
  assert.equal(normalizeBarcode('EAN: 0012345678905'), '0012345678905');
  assert.equal(normalizeBarcode('texto'), '');
});
test('basic validation accepts 8, 12 and 13 digits, without overstrict checksum rules', () => {
  for (const input of ['96385074', code, `0${code}`]) assert.equal(isValidBarcode(input), true);
  for (const input of ['', '123', '123456789', '12345678901234', 'abcdefghijkl']) assert.equal(isValidBarcode(input), false);
  assert.equal(validatedBarcode(' 012-345-678-905 '), code);
  assert.throws(() => validatedBarcode('abc'), /Código inválido/);
});
test('zero-padded GTIN aliases preserve UPC-A and EAN-8 input strings', () => {
  assert.deepEqual(barcodeAliases(code), [code, `0${code}`]);
  assert.deepEqual(barcodeAliases(`0${code}`), [`0${code}`, code]);
  assert.deepEqual(barcodeAliases('7891234567890'), ['7891234567890']);
  assert.deepEqual(barcodeAliases('96385074'), ['96385074', '0000096385074', '000096385074']);
  assert.deepEqual(barcodeAliases('0000096385074'), ['0000096385074', '000096385074', '96385074']);
});
test('format suggestions recognize physical formats and prefer UHD in combined releases', () => {
  for (const [title, expected] of [['Filme 4K Ultra HD + Blu-ray', 'UHD_4K'], ['UHD', 'UHD_4K'], ['Filme BLU-RAY', 'BLURAY'], ['Bluray', 'BLURAY'], ['Filme Blu ray + DVD', 'BLURAY'], ['DVD edição', 'DVD'], ['Filme VHS', 'VHS'], ['Filme digital', null], ['4Kids', null], [null, null]]) assert.equal(inferMediaFormat(title), expected, title);
});
test('product title cleanup only proposes a query and preserves sequel numbers', () => {
  assert.equal(productMovieQuery("Scream DVD Collector's Edition"), 'Scream');
  assert.equal(productMovieQuery('Pânico 2 (1997) [Blu-ray] SteelBook'), 'Pânico 2');
  assert.equal(productMovieQuery(null), '');
});
test('UPC mapper selects first usable HTTPS image, deduplicates and exposes no raw prices', () => {
  const product = mapUpcResponse(fixtures.found, code);
  assert.deepEqual(product, { source: 'UPCITEMDB', barcode: code, title: "Scream DVD Collector's Edition", rawProductName: "Scream DVD Collector's Edition", description: 'DVD de filme', brand: 'Marca informada', publisher: null, images: ['https://example.test/cover.jpg', 'https://example.test/back.jpg'], primaryImageUrl: 'https://example.test/cover.jpg' });
  assert.equal('lowest_recorded_price' in product, false);
  for (const url of ['http://example.test/a', 'file:///a', 'data:image/png;x', 'https://secret@example.test/a', 42, 'relative/a']) assert.equal(safeProductImage(url), null);
});
test('missing images, name and metadata remain absent without invented distributor', () => {
  assert.equal(mapUpcResponse(fixtures.withoutImage, code).primaryImageUrl, null);
  assert.equal(mapUpcResponse(fixtures.incomplete, code), null);
  assert.equal(mapUpcProduct({ brand: '  Marca  ', images: 'not-an-array' }, code).brand, 'Marca');
});
test('EAN-8 response represented by UPCitemdb as padded EAN-13 maps to original code', () => {
  const result = mapUpcResponse({ code: 'OK', items: [{ ean: '0000096385074', upc: '000096385074', title: 'Produto EAN-8' }] }, '96385074');
  assert.equal(result.barcode, '96385074');
  assert.equal(result.title, 'Produto EAN-8');
});
test('not found is distinct from malformed envelopes and API errors', () => {
  assert.equal(mapUpcResponse(fixtures.notFound, code), null);
  assert.equal(mapUpcResponse({ code: 'NOT_FOUND' }, code), null);
  for (const body of [null, {}, { code: 'OK' }, { code: 'SERVER_ERR' }]) assert.throws(() => mapUpcResponse(body, code), (error) => error instanceof UpcError && error.kind === 'response');
});
test('Supabase-first skips UPC when the Edition is known', async () => {
  const edition = { id: 'known' }; const calls = [];
  const result = await resolveBarcode(` ${code} `, { findEdition: async (value) => { calls.push(value); return edition; }, lookupProduct: async () => { throw new Error('UPC must not run'); } });
  assert.deepEqual(result, { source: 'SUPABASE', barcode: code, edition });
  assert.deepEqual(calls, [code]);
});
test('UPC is consulted only after catalog miss; missing product remains NOT_FOUND', async () => {
  for (const candidate of [null, mapUpcResponse(fixtures.found, code)]) {
    const calls = []; const controller = new AbortController();
    const result = await resolveBarcode(code, {
      findEdition: async (value, signal) => { assert.equal(signal, controller.signal); calls.push('supabase'); return null; },
      lookupProduct: async (value, signal) => { assert.equal(value, code); assert.equal(signal, controller.signal); calls.push('upc'); return candidate; },
    }, controller.signal);
    assert.deepEqual(calls, ['supabase', 'upc']); assert.equal(result.source, candidate ? 'UPCITEMDB' : 'NOT_FOUND');
  }
});
test('invalid input and failed catalog reads do not spend UPC quota', async () => {
  const sources = { findEdition: async () => { throw new Error('catalog offline'); }, lookupProduct: async () => { throw new Error('UPC must not run'); } };
  await assert.rejects(resolveBarcode('invalid', sources), /Código inválido/);
  await assert.rejects(resolveBarcode(code, sources), /catalog offline/);
});
test('Edition payload keeps physical image apart from Movie and copy condition', () => {
  const draft = { mediaFormat: 'UHD_4K', packagingType: 'STEELBOOK', publisher: ' Empresa ', region: '', country: ' ', editionName: ' Nome ', productImageUrl: 'https://example.test/cover.jpg', isSpecialEdition: false, isLimitedEdition: true };
  assert.deepEqual(barcodeEditionPayload('movie-id', ` ${code} `, draft), { movie_id: 'movie-id', barcode: code, media_format: 'UHD_4K', packaging_type: 'STEELBOOK', publisher: 'Empresa', region: null, country: null, edition_name: 'Nome', product_image_url: 'https://example.test/cover.jpg', custom_cover_url: null, is_special_edition: false, is_limited_edition: true });
  assert.equal(barcodeEditionPayload('movie-id', code, { ...draft, productImageUrl: null }).product_image_url, null);
});
test('racing barcode association cannot silently switch the confirmed movie or format', () => {
  const edition = { media_format: 'DVD', movie: { tmdb_id: 4232 } };
  assert.doesNotThrow(() => assertCompatibleEdition(edition, '4232', 'DVD'));
  assert.throws(() => assertCompatibleEdition(edition, '679', 'DVD'), /Consulte novamente/);
  assert.throws(() => assertCompatibleEdition(edition, '4232', 'BLURAY'), /Consulte novamente/);
});
test('known Edition uses centralized custom/product/movie cover priority', () => {
  const edition = { custom_cover_url: ' custom ', product_image_url: ' product ', movie: { poster_url: 'poster' } };
  assert.equal(editionCover(edition), 'custom');
  assert.equal(editionCover({ ...edition, custom_cover_url: null }), 'product');
  assert.equal(editionCover({ ...edition, custom_cover_url: null, product_image_url: null }), 'poster');
});
test('UPC service uses trial without keys and normalizes before calling HTTP', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (url, options) => {
      assert.equal(String(url), `https://api.upcitemdb.com/prod/trial/lookup?upc=${code}`);
      assert.deepEqual(options.headers, { Accept: 'application/json' });
      return new Response(JSON.stringify(fixtures.found));
    };
    assert.equal((await lookupBarcode(` ${code} `)).barcode, code);
  } finally { globalThis.fetch = original; }
});
test('HTTP not found, quota, malformed JSON and network failure are distinct', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => new Response(JSON.stringify({ code: 'NOT_FOUND' }), { status: 404 });
    assert.equal(await lookupBarcode(code), null);
    for (const [response, kind] of [[new Response('', { status: 429 }), 'rate-limit'], [new Response('', { status: 503 }), 'http'], [new Response('invalid'), 'response']]) {
      globalThis.fetch = async () => response;
      await assert.rejects(upcGet(code), (error) => error instanceof UpcError && error.kind === kind);
    }
    globalThis.fetch = async () => { throw new Error('private details'); };
    await assert.rejects(upcGet(code), (error) => error instanceof UpcError && error.kind === 'network' && !error.message.includes('private'));
  } finally { globalThis.fetch = original; }
});
test('UPC request forwards cancellation and does not expose raw network errors', async () => {
  const original = globalThis.fetch;
  try {
    const controller = new AbortController();
    globalThis.fetch = async (_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('aborted'))));
    const pending = upcGet(code, controller.signal); controller.abort();
    await assert.rejects(pending, (error) => error.name === 'AbortError');
  } finally { globalThis.fetch = original; }
});
test('paid or arbitrary endpoint configuration is rejected before any HTTP request', async () => {
  const original = process.env.EXPO_PUBLIC_UPCITEMDB_LOOKUP_URL;
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async () => { throw new Error('HTTP must not run'); };
    for (const endpoint of ['https://api.upcitemdb.com/prod/v1/lookup', 'https://example.test/lookup']) {
      process.env.EXPO_PUBLIC_UPCITEMDB_LOOKUP_URL = endpoint;
      await assert.rejects(upcGet(code), (error) => error.kind === 'configuration');
    }
  } finally {
    globalThis.fetch = originalFetch;
    if (original === undefined) delete process.env.EXPO_PUBLIC_UPCITEMDB_LOOKUP_URL;
    else process.env.EXPO_PUBLIC_UPCITEMDB_LOOKUP_URL = original;
  }
});
