// Storage and profile RLS regression in isolated PostgreSQL/PGlite.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { PGlite } = await import(process.env.ACERVO_PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const a = '11111111-1111-4111-8111-111111111111', b = '22222222-2222-4222-8222-222222222222';
const old = `${a}/avatar-33333333-3333-4333-8333-333333333333.jpg`;
const next = `${a}/avatar-44444444-4444-4444-8444-444444444444.png`;
const foreign = `${b}/avatar-55555555-5555-4555-8555-555555555555.webp`;
let checks = 0;
const query = async (sql, values = []) => (await db.query(sql, values)).rows;
const check = (actual, expected) => { assert.deepEqual(actual, expected); checks++; };
async function denied(sql, values = []) {
  await db.exec('begin; savepoint rejected;');
  let rejected = false;
  try { await db.query(sql, values); } catch { rejected = true; }
  await db.exec('rollback to rejected; commit;');
  check(rejected, true);
}
async function login(uid, anonymous = false) {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)", [uid, JSON.stringify({ sub: uid, is_anonymous: anonymous })]);
  await db.exec('set role authenticated');
}
try {
  await db.exec(`
    create role anon; create role authenticated;
    create schema auth; create schema storage;
    create table auth.users(id uuid primary key, raw_user_meta_data jsonb default '{}');
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id),name text);
    create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1] $$;
    alter table storage.objects enable row level security;
    grant usage on schema auth,storage to authenticated,anon;
    grant execute on all functions in schema auth,storage to authenticated,anon;
    grant select,insert,update,delete on storage.objects to authenticated;
    grant select on storage.objects to anon;
  `);
  for (const filename of ['20261008124824_acervo_foundation.sql', '20261008192603_edition_cover_storage.sql', '20261009143232_copy_photos_and_safe_edition_editing.sql', '20261010012629_profile_photos.sql']) {
    await db.exec(await readFile(new URL(`../../supabase/migrations/${filename}`, import.meta.url), 'utf8'));
  }
  await query('insert into auth.users(id) values ($1),($2)', [a, b]);
  check((await query('select avatar_url from public.profiles where id=$1', [a]))[0].avatar_url, null);
  check((await query("select public,file_size_limit,allowed_mime_types from storage.buckets where id='profile-photos'"))[0], { public: false, file_size_limit: 5242880, allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp'] });
  await login(a);
  check((await query('select id from public.profiles')).map(row => row.id), [a]);
  check((await query("update public.profiles set display_name='Outra pessoa' where id=$1 returning id", [b])).length, 0);
  await query("update public.profiles set display_name='Colecionador' where id=$1", [a]);
  check((await query('select display_name from public.profiles where id=$1', [a]))[0].display_name, 'Colecionador');
  for (const path of [old, next]) await query("insert into storage.objects(bucket_id,name) values ('profile-photos',$1)", [path]);
  await denied("insert into storage.objects(bucket_id,name) values ('profile-photos',$1)", [foreign]);
  await denied("insert into storage.objects(bucket_id,name) values ('profile-photos',$1)", [`${a}/../avatar-33333333-3333-4333-8333-333333333333.jpg`]);
  await query('update public.profiles set avatar_url=$1 where id=$2', [old, a]);
  check((await query('select avatar_url from public.profiles where id=$1', [a]))[0].avatar_url, old);
  check((await query('delete from storage.objects where name=$1 returning id', [old])).length, 0);
  check((await query("update storage.objects set name='changed' where name=$1 returning id", [old])).length, 0);
  for (const path of ['https://example.com/avatar.jpg', old + '?token=secret', foreign, `${a}/avatar-66666666-6666-4666-8666-666666666666.jpg`]) await denied('update public.profiles set avatar_url=$1 where id=$2', [path, a]);
  await login(b);
  check((await query('select name from storage.objects where name=$1', [old])).length, 0);
  check((await query('delete from storage.objects where name=$1 returning id', [old])).length, 0);
  check((await query('update public.profiles set avatar_url=null where id=$1 returning id', [a])).length, 0);
  await query("insert into storage.objects(bucket_id,name) values ('profile-photos',$1)", [foreign]);
  await query('update public.profiles set avatar_url=$1 where id=$2', [foreign, b]);
  await login(a, true);
  check((await query("select name from storage.objects where bucket_id='profile-photos'")).length, 0);
  await denied("insert into storage.objects(bucket_id,name) values ('profile-photos',$1)", [`${a}/avatar-77777777-7777-4777-8777-777777777777.jpg`]);
  await denied('update public.profiles set avatar_url=null where id=$1', [a]);
  check((await query('delete from storage.objects where name=$1 returning id', [next])).length, 0);
  await login(a);
  await query('update public.profiles set avatar_url=$1 where id=$2 and avatar_url=$3', [next, a, old]);
  check((await query('select avatar_url,display_name from public.profiles where id=$1', [a]))[0], { avatar_url: next, display_name: 'Colecionador' });
  check((await query('update public.profiles set avatar_url=null where id=$1 and avatar_url=$2 returning id', [a, old])).length, 0);
  check((await query('delete from storage.objects where name=$1 returning id', [old])).length, 1);
  check((await query('delete from storage.objects where name=$1 returning id', [next])).length, 0);
  await query('update public.profiles set avatar_url=null where id=$1', [a]);
  check((await query('delete from storage.objects where name=$1 returning id', [next])).length, 1);
  check((await query('select avatar_url from public.profiles where id=$1', [a]))[0].avatar_url, null);
  await login(b);
  check((await query('select avatar_url from public.profiles where id=$1', [b]))[0].avatar_url, foreign);
  await db.exec('reset role; set role anon');
  await denied('select * from public.profiles');
  check((await query("select name from storage.objects where bucket_id='profile-photos'")).length, 0);
  await db.exec('reset role');
  check((await query("select public from storage.buckets where id='edition-covers'"))[0].public, true);
  console.log(`Passed ${checks} profile photo and Storage/RLS checks.`);
} finally { await db.close(); }
