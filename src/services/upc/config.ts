export const trialLookupUrl = 'https://api.upcitemdb.com/prod/trial/lookup';
export function upcLookupUrl(): string {
  const value = process.env.EXPO_PUBLIC_UPCITEMDB_LOOKUP_URL?.trim() || trialLookupUrl;
  // Paid credentials must move to a backend, not to an EXPO_PUBLIC variable.
  if (value !== trialLookupUrl) throw new Error('Configuração UPCitemdb inválida.');
  return value;
}
