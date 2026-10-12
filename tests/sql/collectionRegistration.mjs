// Run with the same temporary PGlite module as the other SQL regressions.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { prepareCollectionRegistration, persistCollectionRegistration } from '../../src/services/collection/registration.ts';
import { moviePayload, copyPayload } from '../../src/services/collection/mappers.ts';
const { PGlite } = await import(process.env.ACERVO_PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const owner = '11111111-1111-4111-8111-111111111111', other = '22222222-2222-4222-8222-222222222222';
const movie = { id: '4232', title: 'Pânico', originalTitle: 'Scream', year: 1996, overview: 'Sinopse', runtime: 111, posterUrl: 'tmdb-poster', backdropUrl: 'tmdb-backdrop', director: 'Wes Craven', genres: ['Terror'] };
const front = `https://example.supabase.co/storage/v1/object/public/edition-covers/${owner}/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg`;
const back = `https://example.supabase.co/storage/v1/object/public/edition-covers/${owner}/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.png`;
let checks = 0;
const query = async (sql, params = []) => (await db.query(sql, params)).rows;
const check = (value, expected) => { assert.deepEqual(value, expected); checks++; };
const login = async uid => {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)", [uid, JSON.stringify({ sub: uid, is_anonymous: false })]);
  await db.exec('set role authenticated');
};
const insert = async (table, fields) => {
  assert.ok(['movies', 'editions', 'collection_items'].includes(table));
  const keys = Object.keys(fields);
  assert.ok(keys.every(key => /^[a-z_]+$/.test(key)));
  return (await query(`insert into public.${table} (${keys.join(',')}) values (${keys.map((_, i) => '$' + (i + 1)).join(',')}) returning id`, Object.values(fields)))[0];
};
const writers = {
  movie: async data => {
    const fields = moviePayload(data);
    return (await query('select id from public.movies where tmdb_id=$1', [fields.tmdb_id]))[0] ?? insert('movies', fields);
  },
  edition: (movieId, fields) => insert('editions', { ...fields, movie_id: movieId }),
  copy: (editionId, fields) => insert('collection_items', copyPayload(owner, editionId, fields.condition, fields)),
};
try {
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text);
    create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1] $$;
    alter table storage.objects enable row level security;
    grant usage on schema auth,storage to authenticated,anon;
    grant execute on all functions in schema auth,storage to authenticated,anon;
    grant select,insert,update,delete on storage.objects to authenticated;
  `);
  for (const filename of ['20261008124824_acervo_foundation.sql', '20261008192603_edition_cover_storage.sql', '20261009143232_copy_photos_and_safe_edition_editing.sql', '20261009150017_copy_photo_cover_preference.sql', '20261009193901_box_sets.sql', '20261010002750_edition_back_cover.sql', '20261010021419_edition_cover_types.sql', '20261010025750_edition_video_standard.sql']) {
    await db.exec(await readFile(new URL(`../../supabase/migrations/${filename}`, import.meta.url), 'utf8'));
  }
  await db.query('insert into auth.users(id) values ($1),($2)', [owner, other]);
  await login(owner);
  const prepared = prepareCollectionRegistration('BLURAY', 'VERY_GOOD', { packagingType: 'STEELBOOK', barcode: '0012345678905', customCoverUrl: front, backCoverUrl: back, publisher: 'Sony', country: 'Brasil', region: 'A', videoStandard: 'NTSC', discCount: '2', editionName: 'Especial', isSpecialEdition: true, isLimitedEdition: true }, { price: '88,90', date: '2026-10-12', place: 'Loja', notes: 'Minha cópia', favorite: true });
  const saved = await persistCollectionRegistration(movie, prepared, writers);
  const row = (await query('select e.*,ci.user_id,ci.condition,ci.purchase_price::text,ci.purchase_date::text,ci.purchase_place,ci.notes,ci.is_favorite,m.poster_url,m.backdrop_url from public.collection_items ci join public.editions e on e.id=ci.edition_id join public.movies m on m.id=e.movie_id where ci.id=$1', [saved.id]))[0];
  for (const [key, value] of Object.entries(prepared.edition)) check(row[key], value);
  check(row.user_id, owner);
  check(row.condition, 'VERY_GOOD');
  check(row.purchase_price, '88.90');
  check(row.purchase_date, '2026-10-12');
  check(row.purchase_place, 'Loja');
  check(row.notes, 'Minha cópia');
  check(row.is_favorite, true);
  check(row.poster_url, 'tmdb-poster');
  check(row.backdrop_url, 'tmdb-backdrop');
  for (const format of ['DVD', 'UHD_4K', 'VHS']) {
    const optional = prepareCollectionRegistration(format, 'GOOD', {}, format === 'DVD' ? { price: '0' } : {});
    const result = await persistCollectionRegistration(movie, optional, writers);
    const stored = (await query('select e.media_format,e.barcode,e.disc_count,e.edition_name,e.publisher,e.country,e.region,e.custom_cover_url,e.back_cover_url,e.is_special_edition,e.is_limited_edition,ci.purchase_price::text,ci.purchase_date::text,ci.purchase_place,ci.notes,ci.is_favorite from public.collection_items ci join public.editions e on e.id=ci.edition_id where ci.id=$1', [result.id]))[0];
    check(stored, { media_format: format, barcode: null, disc_count: null, edition_name: null, publisher: null, country: null, region: null, custom_cover_url: null, back_cover_url: null, is_special_edition: false, is_limited_edition: false, purchase_price: format === 'DVD' ? '0.00' : null, purchase_date: null, purchase_place: null, notes: null, is_favorite: false });
  }
  check((await query('select count(*)::integer as n from public.movies'))[0].n, 1);
  check((await query('select count(*)::integer as n from public.editions'))[0].n, 4);
  check((await query('select count(*)::integer as n from public.collection_items'))[0].n, 4);
  await login(other);
  check((await query('select id from public.collection_items where id=$1', [saved.id])).length, 0);
  check((await query('select count(*)::integer as n from public.collection_items'))[0].n, 0);
  console.log(`Initial registration + RLS: ${checks} assertions passed (Movie → Edition → CollectionItem, all formats, optional data and two owners).`);
} finally { await db.close(); }
