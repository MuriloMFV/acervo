import { authenticate, failure, json, preflight, requestBody } from '../_shared/http.ts';
import { COVER_BUCKET, downloadCover, verifyCover } from '../_shared/covers.ts';
Deno.serve(async (req) => {
  const early = preflight(req); if (early) return early;
  try {
    const { client, userId } = await authenticate(req);
    const body = await requestBody(req);
    const key = Deno.env.get('SERPAPI_API_KEY');
    if (!key) return json({ error: 'Busca de capas ainda não configurada' }, 503);
    const url = await verifyCover(body.copyToken, userId, key);
    const { bytes, mime, extension } = await downloadCover(url);
    const path = `${userId}/${crypto.randomUUID()}.${extension}`;
    const { error } = await client.storage.from(COVER_BUCKET).upload(path, bytes, { contentType: mime, upsert: false, cacheControl: '31536000' });
    if (error) return json({ error: 'Não foi possível salvar a capa' }, 502);
    return json({ customCoverUrl: client.storage.from(COVER_BUCKET).getPublicUrl(path).data.publicUrl });
  } catch (error) { return failure(error); }
});
