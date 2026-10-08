export interface SupabaseConfiguration {
  url: string;
  publicKey: string;
}

export function readSupabaseConfiguration(urlValue: string | undefined, keyValue: string | undefined): SupabaseConfiguration {
  const url = urlValue?.trim();
  const publicKey = keyValue?.trim();
  if (!url || !publicKey) throw new Error('Configure as variáveis públicas do Supabase.');
  let parsed: URL;
  try { parsed = new URL(url); } catch { throw new Error('URL do Supabase inválida.'); }
  if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error('URL do Supabase inválida.');
  }
  let isPublicKey = publicKey.startsWith('sb_publishable_') && publicKey.length > 'sb_publishable_'.length;
  if (!isPublicKey && publicKey.split('.').length === 3) {
    try {
      const payload = publicKey.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const claims: unknown = JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '=')));
      isPublicKey = typeof claims === 'object' && claims !== null && 'role' in claims && claims.role === 'anon';
    } catch { isPublicKey = false; }
  }
  // This catches accidental privileged credentials; the server still validates
  // keys/JWTs, and RLS remains the authorization boundary.
  if (!isPublicKey) throw new Error('Use apenas uma chave pública do Supabase.');
  return { url: url.replace(/\/$/, ''), publicKey };
}
