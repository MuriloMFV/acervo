import assert from 'node:assert/strict';
import test from 'node:test';
import { exportImageBase64, optionalExportAssets } from '../src/services/export/assets.ts';
import { CollectionExportError, exportStep, exportErrorMessage, exportDiagnostic } from '../src/services/export/errors.ts';
import { exportItems, buildCollectionDocument } from '../src/services/export/document.ts';

test('image export uses native base64 and succeeds even when the saved native URI is inaccessible', async () => {
  let options;
  const image = await exportImageBase64('image/png', async value => {
    options = value;
    return { base64: 'AAAA', get uri() { throw new Error("Missing 'READ' permission for accessing the file."); } };
  }, () => assert.fail('Must not access the restricted image file'));
  assert.equal(options.base64, true);
  assert.equal(image, 'data:image/png;base64,AAAA');
});
test('failed cleanup cannot discard an embedded cover; invalid/native failed images remain errors', async () => {
  const image = await exportImageBase64('image/jpeg', async () => ({ base64: 'AAAA', uri: 'file:///cache/cover.jpg' }), () => { throw new Error('No WRITE permission'); });
  assert.equal(image, 'data:image/jpeg;base64,AAAA');
  for (const base64 of [undefined, '', 'AAAA" onerror="x']) await assert.rejects(exportImageBase64('image/jpeg', async () => ({ base64, uri: 'native-cache' })), /Imagem indisponível/);
  await assert.rejects(exportImageBase64('image/png', async () => { throw new Error('Native image failed'); }), /Native image failed/);
});
test('inaccessible logo/fonts use document fallbacks and keep every movie and box row', async () => {
  const failures = [];
  const unavailable = async () => { throw new Error("Missing 'READ' permission for accessing the file."); };
  const decorations = await optionalExportAssets({ logo: unavailable, bodyFont: unavailable, titleFont: unavailable }, (asset) => failures.push(asset));
  assert.deepEqual(decorations, { logo: '', bodyFont: '', titleFont: '' });
  assert.deepEqual(failures.sort(), ['bodyFont', 'logo', 'titleFont']);
  const items = exportItems([{ id: 'movie', condition: 'GOOD', edition: { media_format: 'DVD', disc_count: 1, movie: { title: 'Alien', release_year: 1979, poster_url: null } } }],
    [{ id: 'box', condition: 'SEALED', box_set: { name: 'Trilogia', media_format: 'BLURAY', disc_count: 3, cover_url: null, movies: [{ position: 1, movie: { poster_url: null } }, { position: 2, movie: { poster_url: null } }] } }]);
  const html = buildCollectionDocument(items, new Date('2026-10-12T12:00:00Z'), { ...decorations, covers: {} });
  assert.match(html, /<h1>Acervo<\/h1>/); assert.match(html, /2 itens/);
  assert.match(html, /Alien/); assert.match(html, /Trilogia/); assert.match(html, /Tipo: Box · 2 filmes/);
  assert.match(html, /Arial,sans-serif/); assert.match(html, /size:A4/);
});
test('only the failing decorative asset falls back; existing logo and fonts remain unchanged', async () => {
  const assets = await optionalExportAssets({ logo: async () => 'data:image/png;base64,AAAA', bodyFont: async () => { throw new Error('Font unavailable'); }, titleFont: async () => 'AAAA' });
  assert.deepEqual(assets, { logo: 'data:image/png;base64,AAAA', bodyFont: '', titleFont: 'AAAA' });
});
test('database, cache, print and share failures expose their own stage while preserving the original cause', async () => {
  for (const stage of ['movies', 'boxes', 'cache', 'pdf', 'sharing', 'session', 'availability', 'document']) {
    const cause = new Error('Native failure');
    await assert.rejects(exportStep(stage, async () => { throw cause; }), error => {
      assert.ok(error instanceof CollectionExportError); assert.equal(error.stage, stage); assert.equal(error.cause, cause);
      assert.equal(exportErrorMessage(error), error.message);
      assert.deepEqual(exportDiagnostic(error), { etapa: stage, codigo: undefined, motivo: 'Native failure' });
      return true;
    });
  }
  assert.equal(await exportStep('pdf', async () => 'saved'), 'saved');
  assert.match(exportErrorMessage('unknown failure'), /Não foi possível exportar/);
});
test('a missing box query cannot silently generate a film-only document and nested stages remain accurate', async () => {
  let built = false;
  await assert.rejects(async () => {
    await Promise.all([exportStep('movies', async () => []), exportStep('boxes', async () => { throw { code: 'PGRST200', message: 'Relationship missing' }; })]);
    built = true;
  }, error => error instanceof CollectionExportError && error.stage === 'boxes');
  assert.equal(built, false);
  const specific = new CollectionExportError('session', new Error('Changed user'));
  await assert.rejects(exportStep('pdf', async () => { throw specific; }), error => error === specific);
});
test('development diagnostics redact signed URLs and device URIs instead of logging credentials', () => {
  const error = new CollectionExportError('pdf', { code: 'ERR_READ', message: 'Cannot access https://storage.test/a.jpg?token=secret or file:///private/customer/cover.jpg' });
  const diagnostic = exportDiagnostic(error);
  assert.equal(diagnostic.etapa, 'pdf'); assert.equal(diagnostic.codigo, 'ERR_READ');
  assert.equal(diagnostic.motivo, 'Cannot access [arquivo] or [arquivo]');
  assert.doesNotMatch(JSON.stringify(diagnostic), /secret|customer|storage\.test/);
});
