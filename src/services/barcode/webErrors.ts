export type BarcodeWebFailure = 'timeout' | 'rate-limit' | 'auth' | 'unavailable';
export class BarcodeWebError extends Error {
  readonly kind: BarcodeWebFailure;
  constructor(kind: BarcodeWebFailure) { super(barcodeWebFailureMessage(kind)); this.kind = kind; }
}
export function barcodeWebFailureMessage(kind: BarcodeWebFailure): string {
  return kind === 'timeout' ? 'A busca demorou demais. Tente novamente.'
    : kind === 'rate-limit' ? 'Limite de buscas atingido. Tente mais tarde.'
    : kind === 'auth' ? 'Entre novamente para buscar na web.'
    : 'Busca web indisponível. Tente novamente ou continue pelo filme.';
}
