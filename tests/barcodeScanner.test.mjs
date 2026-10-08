import assert from 'node:assert/strict';
import test from 'node:test';
import { createBarcodeScanGate, capturedBarcode, scannerBarcodeTypes } from '../src/utils/barcodeScanner.ts';
import { resolveBarcode } from '../src/services/barcode/lookup.ts';
import { barcodeEditionPayload } from '../src/services/barcode/mappers.ts';

const upc = '012345678905';
function readyGate() { const gate = createBarcodeScanGate(); gate.rearm(); gate.resume(); return gate; }

test('scanner enables EAN-13, EAN-8 and UPC-A', () => {
  for (const type of ['ean13', 'ean8', 'upc_a']) assert.ok(scannerBarcodeTypes.includes(type));
});
test('scanner normalizes valid codes and preserves leading zeroes', () => {
  for (const code of ['96385074', upc, `0${upc}`]) {
    assert.deepEqual(readyGate().read(` ${code} `), { status: 'accepted', code });
  }
});
test('synchronous lock suppresses repeated events and different codes until rearmed', () => {
  const gate = readyGate();
  assert.equal(gate.read(upc).status, 'accepted');
  assert.equal(gate.read(upc).status, 'ignored');
  assert.equal(gate.read('96385074').status, 'ignored');
  gate.pause(); gate.resume();
  assert.equal(gate.read(upc).status, 'ignored');
  gate.rearm();
  assert.equal(gate.read(upc).status, 'ignored');
  gate.resume();
  assert.equal(gate.read(upc).status, 'accepted');
});
test('invalid read does not lock next valid code', () => {
  const gate = readyGate();
  assert.equal(gate.read('invalid').status, 'invalid');
  assert.equal(gate.read(upc).status, 'accepted');
});
test('paused camera ignores queued events; resume before capture permits reading', () => {
  const gate = readyGate(); gate.pause();
  assert.equal(gate.read(upc).status, 'ignored');
  gate.resume(); assert.equal(gate.read(upc).status, 'accepted');
});
test('manual route accepts normalized scan parameter and rejects malformed parameters', () => {
  assert.equal(capturedBarcode(' 012-345-678-905 '), upc);
  for (const param of [undefined, ['96385074', upc], 'invalid']) assert.equal(capturedBarcode(param), '');
});
test('captured known edition goes through existing lookup without UPC', async () => {
  const read = readyGate().read(upc);
  const edition = { id: 'known' };
  const result = await resolveBarcode(capturedBarcode(read.code), {
    findEdition: async (code) => { assert.equal(code, upc); return edition; },
    lookupProduct: async () => { assert.fail('known edition must skip UPC'); },
  });
  assert.equal(result.source, 'SUPABASE');
  assert.equal(result.edition, edition);
});
test('Brazilian barcode survives catalog and UPC misses into existing edition payload', async () => {
  const barcode = '7891234567890';
  const read = readyGate().read(barcode);
  const calls = [];
  const result = await resolveBarcode(capturedBarcode(read.code), {
    findEdition: async (code) => { calls.push(['supabase', code]); return null; },
    lookupProduct: async (code) => { calls.push(['upc', code]); return null; },
  });
  assert.deepEqual(calls, [['supabase', barcode], ['upc', barcode]]);
  assert.deepEqual(result, { source: 'NOT_FOUND', barcode });
  const payload = barcodeEditionPayload('confirmed-movie', result.barcode, {
    mediaFormat: 'DVD', packagingType: 'STANDARD', publisher: '', region: '', country: '', editionName: '', productImageUrl: null, isSpecialEdition: false, isLimitedEdition: false,
  });
  assert.equal(payload.barcode, barcode);
  assert.equal(payload.movie_id, 'confirmed-movie');
});
