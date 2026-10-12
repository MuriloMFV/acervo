import assert from 'node:assert/strict';
import test from 'node:test';
import { applyScannedEditionBarcode, parseEditionForm } from '../src/services/collection/editionEditing.ts';
import { createBarcodeScanGate } from '../src/utils/barcodeScanner.ts';

const form = { editionName: 'Minha edição', publisher: 'Sony', country: 'Brasil', region: '4', discCount: '2', customCoverUrl: 'front', backCoverUrl: 'back', packagingType: 'STEELBOOK', videoStandard: 'NTSC', expectedUpdatedAt: '2026-10-12T00:00:00Z' };

test('adding a barcode reuses normalization and preserves leading zeroes as a string', () => {
  const fields = parseEditionForm({ ...form, barcode: ' EAN: 0012-3456-78905 ' });
  assert.equal(fields.barcode, '0012345678905');
  assert.equal(fields.expected_updated_at, form.expectedUpdatedAt);
  for (const code of ['00123456', '012345678905', '0012345678905']) {
    assert.equal(parseEditionForm({ ...form, barcode: code }).barcode, code);
  }
});

test('changing a barcode preserves the remaining edition fields and does not rewrite the draft', () => {
  const draft = { ...form, barcode: '7892770006398' };
  const original = structuredClone(draft);
  const before = parseEditionForm(draft);
  const after = parseEditionForm({ ...draft, barcode: '7892770016182' });
  assert.deepEqual(after, { ...before, barcode: '7892770016182' });
  assert.deepEqual(draft, original);
  for (const key of ['id', 'movie_id', 'media_format', 'product_image_url', 'poster_url', 'condition']) assert.equal(key in after, false);
});

test('clearing the barcode explicitly sends null and older forms omit it', () => {
  for (const barcode of ['', '   ']) assert.equal(parseEditionForm({ ...form, barcode }).barcode, null);
  const { expectedUpdatedAt, ...legacy } = form;
  assert.equal('barcode' in parseEditionForm(legacy), false);
  assert.equal('expected_updated_at' in parseEditionForm(legacy), false);
  assert.equal('expected_updated_at' in parseEditionForm(form), false);
});

test('invalid manual barcode uses the existing validation error', () => {
  for (const barcode of ['1234567', '123456789', '00123456789056', 'texto', '---']) {
    assert.throws(() => parseEditionForm({ ...form, barcode }), /Código inválido\. Use 8, 12 ou 13 dígitos\./);
  }
});

test('accepted scanner result fills only the edition barcode field without looking up or saving', () => {
  const gate = createBarcodeScanGate();
  gate.rearm(); gate.resume();
  const read = gate.read(' 0012-3456-78905 ');
  assert.equal(read.status, 'accepted');
  const draft = { ...form, barcode: '7892770006398' };
  const original = structuredClone(draft);
  const filled = applyScannedEditionBarcode(draft, read.code);
  assert.deepEqual(filled, { ...draft, barcode: '0012345678905' });
  assert.deepEqual(draft, original);
  assert.equal(parseEditionForm(filled).barcode, '0012345678905');
  assert.equal(gate.read('7892770016182').status, 'ignored');
});

test('invalid or missing scanner results keep a manually entered barcode intact', () => {
  const draft = { ...form, barcode: '012345678905' };
  for (const value of [undefined, ['96385074'], '', 'invalido', '1234567']) assert.equal(applyScannedEditionBarcode(draft, value), draft);
});
