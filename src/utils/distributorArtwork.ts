import type { DistributorId } from '../data/distributors';

// Rendering only: the supplied PNGs stay unchanged. SVG filters preserve the
// Paramount lettering and use Imagem Filmes' white artwork as its alpha mask.
export function distributorRasterMatrix(id: DistributorId, color: string): number[] | null {
  const [r, g, b] = [1, 3, 5].map(start => parseInt(color.slice(start, start + 2), 16) / 255);
  if (id === 'paramount') return [
    -r, 0, 0, 0, r,
    0, -g, 0, 0, g,
    0, 0, -b, 0, b,
    0, 0, 0, 1, 0,
  ];
  if (id === 'imagem') return [
    0, 0, 0, r, 0,
    0, 0, 0, g, 0,
    0, 0, 0, b, 0,
    1 / 3, 1 / 3, 1 / 3, 0, 0,
  ];
  return null;
}
