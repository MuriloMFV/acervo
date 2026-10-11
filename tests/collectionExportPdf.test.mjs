import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { saveCollectionPdf } from '../src/services/export/pdf.ts';

const pdfBytes = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n');

test('export saves PDF bytes in the app cache without accessing the restricted Print URI', async () => {
  const folder = mkdtempSync(join(tmpdir(), 'acervo-export-test-'));
  const path = join(folder, 'Acervo.pdf');
  try {
    const file = {
      get exists() { return existsSync(path); },
      get size() { return existsSync(path) ? statSync(path).size : null; },
      write(content, options) { writeFileSync(path, content, { encoding: options.encoding }); },
    };
    await saveCollectionPdf('<html>Minha coleção</html>', file, async options => {
      assert.equal(options.base64, true);
      assert.equal(options.html, '<html>Minha coleção</html>');
      return {
        base64: pdfBytes.toString('base64'),
        get uri() { throw new Error("Missing 'READ' permission for accessing the file."); },
      };
    });
    assert.equal(file.exists, true);
    assert.deepEqual(readFileSync(path), pdfBytes);
  } finally { rmSync(folder, { recursive: true, force: true }); }
});

test('failed printing and missing PDF bytes reject before writing an export file', async () => {
  const file = { exists: false, size: null, write() { assert.fail('Must not write an invalid export'); } };
  await assert.rejects(saveCollectionPdf('html', file, async () => { throw new Error('Print failed'); }), /Print failed/);
  for (const base64 of [undefined, '']) {
    await assert.rejects(saveCollectionPdf('html', file, async () => ({ base64 })), /Não foi possível gerar o PDF/);
  }
});

test('write errors are propagated and empty or missing output cannot complete the export', async () => {
  const print = async () => ({ base64: pdfBytes.toString('base64') });
  const failure = new Error('Disk full');
  await assert.rejects(saveCollectionPdf('html', { exists: false, size: null, write() { throw failure; } }, print), error => error === failure);
  for (const state of [{ exists: false, size: null }, { exists: true, size: 0 }]) {
    await assert.rejects(saveCollectionPdf('html', { ...state, write() {} }, print), /Não foi possível salvar o PDF/);
  }
});
