import assert from 'node:assert/strict';
import test from 'node:test';
import { distributorRasterMatrix } from '../src/utils/distributorArtwork.ts';

// Apply an SVG color matrix to normalized RGBA; this verifies the rendered
// alpha and letter contrast without producing or modifying an image asset.
function apply(matrix, pixel) {
  return Array.from({ length: 4 }, (_, row) => {
    const offset = row * 5;
    return Math.max(0, Math.min(1, pixel.reduce((sum, value, index) => sum + value * matrix[offset + index], matrix[offset + 4])));
  });
}

test('Paramount dark-theme rendering preserves transparency and contrasting lettering', () => {
  const matrix = distributorRasterMatrix('paramount', '#ffffff');
  assert.deepEqual(apply(matrix, [0, 0, 0, 1]), [1, 1, 1, 1]);
  assert.deepEqual(apply(matrix, [1, 1, 1, 1]), [0, 0, 0, 1]);
  assert.equal(apply(matrix, [0.3, 0.4, 0.3, 0])[3], 0);
  assert.equal(apply(matrix, [0, 0, 0, 0.5])[3], 0.5);
});

test('Imagem Filmes black rectangle becomes transparent while white artwork and antialiasing remain', () => {
  const matrix = distributorRasterMatrix('imagem', '#ffffff');
  assert.equal(apply(matrix, [0, 0, 0, 1])[3], 0);
  assert.deepEqual(apply(matrix, [1, 1, 1, 1]), [1, 1, 1, 1]);
  assert.equal(apply(matrix, [0.5, 0.5, 0.5, 1])[3], 0.5);
  assert.equal(apply(matrix, [0, 0, 0, 0])[3], 0);
});

test('raster filters follow the text color and leave colored distributor artwork alone', () => {
  const white = apply(distributorRasterMatrix('imagem', '#e2e2ec'), [1, 1, 1, 1]);
  assert.deepEqual(white, [226 / 255, 226 / 255, 236 / 255, 1]);
  assert.deepEqual(apply(distributorRasterMatrix('paramount', '#e2e2ec'), [0, 0, 0, 1]), white);
  for (const id of ['columbia', 'europa', 'playarte', 'mgm']) assert.equal(distributorRasterMatrix(id, '#e2e2ec'), null);
});
