import { resolveBarcode } from './lookup';
import { findEditionByBarcode } from '../editions';
import { lookupBarcode as lookupProduct } from '../upc';

export function lookupBarcode(code: string, signal?: AbortSignal) {
  return resolveBarcode(code, { findEdition: findEditionByBarcode, lookupProduct }, signal);
}
