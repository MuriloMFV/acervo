import type { CoverSearchParams } from '../../types/covers';
import { normalizeBarcode } from '../../utils/barcode.ts';
const formats = { DVD: 'DVD', BLURAY: 'Blu-ray', UHD_4K: '4K UHD', VHS: 'VHS' };
export function buildEditionCoverQuery(params: CoverSearchParams): string {
  return [params.barcode ? normalizeBarcode(params.barcode) : '', params.title, formats[params.mediaFormat], params.editionName, params.publisher, params.country, params.region ? `região ${params.region}` : '', 'capa'].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim().slice(0,240);
}
