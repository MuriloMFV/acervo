// Isolated PostgreSQL/RLS regression; PGlite is a temporary validation tool,
// not an application dependency. See README for the reproducible command.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { PGlite } = await import(process.env.ACERVO_PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const a='11111111-1111-4111-8111-111111111111', b='22222222-2222-4222-8222-222222222222';
const ia='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', ib='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const movie='33333333-3333-4333-8333-333333333333', edition='44444444-4444-4444-8444-444444444444';
const path=`${a}/${ia}/photo-55555555-5555-4555-8555-555555555555.jpg`;
let checks=0;
const query = async (sql, values=[]) => (await db.query(sql,values)).rows;
const check = (actual, expected) => { assert.deepEqual(actual,expected); checks++; };
async function denied(sql, values=[]) {
  await db.exec('begin; savepoint rejected;');
  let rejected=false;
  try { await db.query(sql,values); } catch { rejected=true; }
  await db.exec('rollback to rejected; commit;');
  check(rejected,true);
}
const login = async (uid, anonymous=false) => {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",[uid,JSON.stringify({sub:uid,is_anonymous:anonymous})]);
  await db.exec('set role authenticated');
};
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
  `);
  for (const filename of ['20261008124824_acervo_foundation.sql','20261008192603_edition_cover_storage.sql','20261009143232_copy_photos_and_safe_edition_editing.sql','20261009150017_copy_photo_cover_preference.sql']) {
    await db.exec(await readFile(new URL(`../../supabase/migrations/${filename}`,import.meta.url),'utf8'));
  }
  await db.query('insert into auth.users(id) values ($1),($2)',[a,b]);
  await db.query("insert into public.movies(id,title,poster_url) values ($1,'Platoon','poster')",[movie]);
  await db.query("insert into public.editions(id,movie_id,barcode,media_format,product_image_url,edition_name) values ($1,$2,'7890552001548','DVD','product','Original')",[edition,movie]);
  await db.query("insert into public.collection_items(id,user_id,edition_id,condition) values ($1,$2,$3,'GOOD'),($4,$5,$3,'GOOD')",[ia,a,edition,ib,b]);
  check((await query("select public,file_size_limit,allowed_mime_types from storage.buckets where id='copy-photos'"))[0], {public:false,file_size_limit:5242880,allowed_mime_types:['image/jpeg','image/png','image/webp']});
  check((await query('select use_photo_as_cover from public.collection_items where id=$1',[ia]))[0].use_photo_as_cover,false);
  await login(a);
  const fields={edition_name:'Especial',publisher:'Distribuidora',country:'Brasil',region:'4',disc_count:2,custom_cover_url:null};
  const rpc='select public.edit_collection_edition($1,$2,$3::jsonb) as id';
  const cloned=(await query(rpc,[ia,edition,JSON.stringify(fields)]))[0].id;
  check(cloned!==edition,true);
  check((await query('select edition_id from public.collection_items where id=$1',[ia]))[0].edition_id,cloned);
  check((await query('select edition_name,disc_count,barcode,product_image_url,movie_id from public.editions where id=$1',[cloned]))[0], {edition_name:'Especial',disc_count:2,barcode:'7890552001548',product_image_url:'product',movie_id:movie});
  check((await query('select edition_name from public.editions where id=$1',[edition]))[0].edition_name,'Original');
  check((await query(rpc,[ia,cloned,JSON.stringify(fields)]))[0].id,cloned);
  await denied(rpc,[ib,edition,JSON.stringify(fields)]);
  await denied(rpc,[ia,edition,JSON.stringify(fields)]);
  await denied(rpc,[ia,cloned,JSON.stringify({...fields,disc_count:0})]);
  await denied(rpc,[ia,cloned,JSON.stringify({...fields,movie_id:movie})]);
  await denied("update public.editions set edition_name='Global' where id=$1",[edition]);
  await login(b);
  check((await query('select edition_id from public.collection_items where id=$1',[ib]))[0].edition_id,edition);
  await login(a);
  await query("insert into storage.objects(bucket_id,name) values ('copy-photos',$1)",[path]);
  await denied("insert into storage.objects(bucket_id,name) values ('copy-photos',$1)",[`${b}/${ib}/photo-55555555-5555-4555-8555-555555555555.jpg`]);
  await denied("insert into storage.objects(bucket_id,name) values ('copy-photos',$1)",[`${a}/${ib}/photo-55555555-5555-4555-8555-555555555555.jpg`]);
  await query('update public.collection_items set photo_url=$1,purchase_date=$2 where id=$3',[path,'2026-10-09',ia]);
  check((await query("select photo_url,purchase_date::text from public.collection_items where id=$1",[ia]))[0],{photo_url:path,purchase_date:'2026-10-09'});
  await query('update public.collection_items set use_photo_as_cover=true where id=$1',[ia]);
  check((await query('select use_photo_as_cover from public.collection_items where id=$1',[ia]))[0].use_photo_as_cover,true);
  check((await query("delete from storage.objects where name=$1 returning id",[path])).length,0);
  check((await query("update storage.objects set name='changed' where name=$1 returning id",[path])).length,0);
  await denied('update public.collection_items set photo_url=$1 where id=$2',[`${b}/${ib}/photo-55555555-5555-4555-8555-555555555555.jpg`,ia]);
  await login(b);
  check((await query('update public.collection_items set use_photo_as_cover=false where id=$1 returning id',[ia])).length,0);
  check((await query('select name from storage.objects where name=$1',[path])).length,0);
  await login(a,true);
  await denied("insert into storage.objects(bucket_id,name) values ('copy-photos',$1)",[path]);
  await denied(rpc,[ia,cloned,JSON.stringify(fields)]);
  await login(a);
  const coverKey=`${a}/66666666-6666-4666-8666-666666666666.jpg`;
  await query("insert into storage.objects(bucket_id,name) values ('edition-covers',$1)",[coverKey]);
  const coverUrl=`https://example.supabase.co/storage/v1/object/public/edition-covers/${coverKey}`;
  const withCover=(await query(rpc,[ia,cloned,JSON.stringify({...fields,custom_cover_url:coverUrl})]))[0].id;
  check((await query('select custom_cover_url from public.editions where id=$1',[withCover]))[0].custom_cover_url,coverUrl);
  check((await query('select photo_url from public.collection_items where id=$1',[ia]))[0].photo_url,path);
  check((await query('select use_photo_as_cover from public.collection_items where id=$1',[ia]))[0].use_photo_as_cover,true);
  await denied(rpc,[ia,withCover,JSON.stringify({...fields,custom_cover_url:'https://evil.test/image.jpg'})]);
  await query(rpc,[ia,withCover,JSON.stringify(fields)]);
  check((await query('select poster_url from public.movies where id=$1',[movie]))[0].poster_url,'poster');
  await query('update public.collection_items set photo_url=null where id=$1',[ia]);
  check((await query('delete from storage.objects where name=$1 returning id',[path])).length,1);
  check((await query('select use_photo_as_cover from public.collection_items where id=$1',[ia]))[0].use_photo_as_cover,false);
  await query('update public.collection_items set use_photo_as_cover=true where id=$1',[ia]);
  check((await query('select use_photo_as_cover from public.collection_items where id=$1',[ia]))[0].use_photo_as_cover,false);
  await db.exec('reset role; set role anon');
  await denied(rpc,[ia,cloned,JSON.stringify(fields)]);
  console.log(`Migration + RLS: ${checks} assertions passed (isolated PostgreSQL, two owners and anonymous roles).`);
} finally { await db.close(); }
