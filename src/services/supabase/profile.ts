import { getSupabaseClient } from './client';
import type { ProfileRow } from './types';
import { validateProfileName } from '../profile/identity';

export async function getProfile(signal?: AbortSignal): Promise<ProfileRow | null> {
  const client = getSupabaseClient();
  const { data: auth, error: authError } = await client.auth.getSession();
  if (authError || !auth.session) throw new Error('Entre para continuar');
  let query = client.from('profiles').select('*').eq('id', auth.session.user.id);
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateProfileName(userId: string, value: string): Promise<ProfileRow> {
  const name = validateProfileName(value);
  const client = getSupabaseClient();
  const { data: auth, error: authError } = await client.auth.getSession();
  if (authError || !auth.session || auth.session.user.id !== userId || auth.session.user.is_anonymous) throw new Error('Entre para continuar.');
  const { data, error } = await client.from('profiles').update({ display_name: name }).eq('id', userId).select('*').single();
  if (error || !data) throw new Error('Não foi possível salvar o nome. Tente novamente.');
  return data;
}
