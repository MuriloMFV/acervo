import test from 'node:test';
import assert from 'node:assert/strict';
import { exportItems, buildCollectionDocument, embeddedImage, escapeHtml } from '../src/services/export/document.ts';
const record = (id, title, overrides = {}) => ({
  id, condition: 'VERY_GOOD', use_photo_as_cover: false,
  edition: { media_format: 'UHD_4K', disc_count: 2, custom_cover_url: 'custom', product_image_url: 'product', movie: { title, release_year: 1999, poster_url: 'poster' } }, ...overrides,
});
const assets = { logo: 'data:image/png;base64,AAAA', bodyFont: 'AAAA', titleFont: 'AAAA', covers: {} };
const date = new Date('2026-10-09T12:00:00Z');
test('exports each real copy without deduplicating movies, sorted by title without mutating input', () => {
  const input = [record('c', 'Matrix'), record('b', 'Alien'), record('a', 'Alien')];
  const rows = exportItems(input);
  assert.deepEqual(rows.map(row => row.id), ['a', 'b', 'c']);
  assert.deepEqual(input.map(row => row.id), ['c', 'b', 'a']);
  assert.equal(rows[0].format, '4K UHD'); assert.equal(rows[0].condition, 'Muito bom');
  assert.equal(rows[0].year, 1999); assert.equal(rows[0].discCount, 2);
});
test('export preserves the same photo/custom/product/poster cover precedence', () => {
  const copy = record('a', 'Alien', { use_photo_as_cover: true, photo_url: 'own/path', photo_cover_url: 'signed-photo' });
  assert.equal(exportItems([copy])[0].coverUrl, 'signed-photo');
  copy.use_photo_as_cover = false;
  assert.equal(exportItems([copy])[0].coverUrl, 'custom');
  copy.edition.custom_cover_url = null;
  assert.equal(exportItems([copy])[0].coverUrl, 'product');
  copy.edition.product_image_url = null;
  assert.equal(exportItems([copy])[0].coverUrl, 'poster');
  copy.edition.movie.poster_url = null;
  assert.equal(exportItems([copy])[0].coverUrl, null);
});
test('missing images and optional fields keep rows with Portuguese labels and placeholders', () => {
  const copy = record('a', 'Alien'); copy.edition.disc_count = null; copy.edition.movie.release_year = null;
  const html = buildCollectionDocument(exportItems([copy]), date, assets);
  assert.match(html, /Sem capa/); assert.match(html, /Muito bom/); assert.match(html, /1 item/);
  assert.match(html, /<td>—<\/td>/); assert.match(html, /Discos/);
  assert.doesNotMatch(html, /src="custom"/);
});
test('empty collection exports a valid document with zero items', () => {
  const html = buildCollectionDocument([], date, assets);
  assert.match(html, /<!DOCTYPE html>/); assert.match(html, /0 itens/); assert.match(html, /Seu acervo está vazio/);
  assert.doesNotMatch(html, /<table>/);
});
test('dynamic text cannot inject markup and only embedded raster images enter the PDF', () => {
  const dangerous = '<script>alert("x")</script> & \'test\'';
  assert.equal(escapeHtml(dangerous), '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;test&#39;');
  const html = buildCollectionDocument(exportItems([record('a', dangerous)]), date, { ...assets, covers: { a: 'https://example.test/x.jpg" onerror="alert(1)' } });
  assert.doesNotMatch(html, /<script>|onerror=|https:\/\/example/);
  assert.match(html, /&lt;script&gt;/);
  for (const value of ['file:///private', 'https://image.test/a.png', 'data:image/svg+xml;base64,AAAA', 'data:image/png;base64,AAAA"']) assert.equal(embeddedImage(value), null);
  assert.equal(embeddedImage('data:image/jpeg;base64,AAAA'), 'data:image/jpeg;base64,AAAA');
});
test('covers are embedded and table headers repeat without splitting normal rows', () => {
  const html = buildCollectionDocument(exportItems([record('a', 'Alien')]), date, { ...assets, covers: { a: 'data:image/jpeg;base64,AAAA' } });
  assert.match(html, /class="cover" src="data:image\/jpeg;base64,AAAA"/);
  assert.match(html, /table-header-group/); assert.match(html, /page-break-inside:avoid/);
  assert.match(html, /Exportado em/); assert.match(html, /09\/10\/2026/);
});
