import { validatedBarcode } from '../../utils/barcode.ts';
import { upcGet } from './client.ts';
import { mapUpcResponse } from './mappers.ts';

export async function lookupBarcode(code: string, signal?: AbortSignal) {
  const barcode = validatedBarcode(code);
  return mapUpcResponse(await upcGet(barcode, signal), barcode);
}
