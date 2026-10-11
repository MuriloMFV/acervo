import { getSupabaseClient } from '../supabase/client';
import type { EditionCoverCandidate } from '../../types/covers';
export { buildEditionCoverQuery, buildEditionBackCoverQuery } from './query';
async function invoke(name: string, body: Record<string, unknown>) {
  const client = getSupabaseClient();
  const { data: auth, error: authError } = await client.auth.getSession();
  if (authError || !auth.session) throw new Error('Entre para continuar');
  const { data, error } = await client.functions.invoke(name, { body, headers: { Authorization: `Bearer ${auth.session.access_token}` } });
  if (error) {
    let message = 'Não foi possível concluir agora. Tente novamente.';
    if (error.context instanceof Response) {
      try { const result = await error.context.json(); if (typeof result.error === 'string') message = result.error; } catch { /* Keep short fallback. */ }
    }
    throw new Error(message);
  }
  return data;
}
export async function searchEditionCovers(query: string): Promise<EditionCoverCandidate[]> {
  const data = await invoke('search-edition-covers', { query });
  if (!Array.isArray(data?.candidates)) throw new Error('Resposta inválida');
  return data.candidates.filter((value: EditionCoverCandidate) => typeof value.id === 'string' && typeof value.imageUrl === 'string' && typeof value.thumbnailUrl === 'string' && typeof value.copyToken === 'string');
}
export async function saveEditionCover(candidate: EditionCoverCandidate): Promise<string> {
  const data = await invoke('save-edition-cover', { copyToken: candidate.copyToken });
  const expected = `${getSupabaseClient().storage.from('edition-covers').getPublicUrl('').data.publicUrl}`;
  if (typeof data?.customCoverUrl !== 'string' || !data.customCoverUrl.startsWith(expected)) throw new Error('Capa inválida');
  return data.customCoverUrl;
}
