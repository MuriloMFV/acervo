import { createClient } from 'npm:@supabase/supabase-js@2.117.3';
import { readLimited } from './covers.ts';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
export const json = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });
export function preflight(req: Request): Response | null {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Método inválido' }, 405);
  return null;
}
export async function authenticate(req: Request) {
  const authorization = req.headers.get('Authorization') ?? '';
  if (!/^Bearer \S+$/.test(authorization)) throw new Error('UNAUTHORIZED');
  const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false },
  });
  // Remote validation checks the user, rather than trusting decoded claims/session.
  const { data, error } = await client.auth.getUser(authorization.slice(7));
  if (error || !data.user || data.user.is_anonymous) throw new Error('UNAUTHORIZED');
  return { client, userId: data.user.id };
}
export async function requestBody(req: Request): Promise<Record<string, unknown>> {
  const bytes = await readLimited(new Response(req.body, { headers: req.headers }), 8192);
  const body = JSON.parse(new TextDecoder().decode(bytes));
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('Solicitação inválida');
  return body;
}
export const failure = (error: unknown) => error instanceof Error && error.message === 'UNAUTHORIZED'
  ? json({ error: 'Entre para continuar' }, 401) : json({ error: 'Não foi possível concluir agora. Tente novamente.' }, 400);
