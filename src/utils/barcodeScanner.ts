import { validatedBarcode } from './barcode.ts';

export const scannerBarcodeTypes = ['ean13', 'ean8', 'upc_a', 'code128', 'code39', 'itf14'] as const;
export type ScanRead = { status: 'accepted'; code: string } | { status: 'invalid' } | { status: 'ignored' };

// Synchronous lock: repeated native events cannot outrun React state updates.
export function createBarcodeScanGate() {
  let active = false;
  let locked = false;
  return {
    rearm() { locked = false; active = false; },
    resume() { active = true; },
    pause() { active = false; },
    read(value: string): ScanRead {
      if (!active || locked) return { status: 'ignored' };
      let code: string;
      try { code = validatedBarcode(value); }
      catch { return { status: 'invalid' }; }
      locked = true;
      return { status: 'accepted', code };
    },
  };
}

export function capturedBarcode(value: string | string[] | undefined): string {
  if (typeof value !== 'string') return '';
  try { return validatedBarcode(value); } catch { return ''; }
}
