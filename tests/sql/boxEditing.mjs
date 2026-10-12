import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { PGlite } = await import(process.env.ACERVO_PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const a='11111111-1111-4111-8111-111111111111', b='22222222-2222-4222-8222-222222222222';
const m1='33333333-3333-4333-8333-333333333333', m2='44444444-4444-4444-8444-444444444444', m3='55555555-5555-4555-8555-555555555555';
let checks=0;
const query=async(sql,args=[]) => (await db.query(sql,args)).rows;
const check=(actual,expected) => { assert.deepEqual(actual,expected); checks++; };
const login=async(id,role='authenticated',claims={}) => {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claims',$2,false)",[id,JSON.stringify(claims)]);
  await db.exec(`set role ${role}`);
};
const rejected=async(sql,args=[],code) => {
  await db.exec('begin;savepoint denied;'); let error;
  try { await db.query(sql,args); } catch (cause) { error=cause; }
  await db.exec('rollback to denied;commit;');
  check(!!error,true); if(code) check(error.code,code);
};
const create='select public.create_collection_box($1,$2::jsonb,$3::uuid[],$4::jsonb) as id';
const edit='select public.edit_collection_box($1,$2,$3::timestamptz,$4::timestamptz,$5::jsonb,$6::uuid[],$7::jsonb) as id';
const minimal={name:'Trilogia',media_format:'DVD',disc_count:3,cover_url:null};
const personal={condition:'VERY_GOOD',purchase_price:45.5,purchase_date:'2026-10-09',purchase_place:'Loja',notes:'Completo'};
let id, boxId;
const draft=async() => (await query(`select cb.id,cb.box_set_id,b.updated_at::text as box_version,cb.updated_at::text as copy_version,
  to_jsonb(b)-array['id','created_by','created_at','updated_at'] as box,
  to_jsonb(cb)-array['id','user_id','box_set_id','created_at','updated_at'] as copy
  from public.collection_boxes cb join public.box_sets b on b.id=cb.box_set_id where cb.id=$1`,[id]))[0];
const args=async(boxPatch={},movieIds=[m1,m2],copyPatch={},expected={}) => {
  const row=await draft();
  return [id,expected.boxId??row.box_set_id,expected.boxVersion??row.box_version,expected.copyVersion??row.copy_version,
    JSON.stringify({...row.box,...boxPatch}),movieIds,JSON.stringify({...row.copy,...copyPatch})];
};
const links=async() => query('select movie_id,position from public.box_set_movies where box_set_id=$1 order by position',[boxId]);
const snapshot=async() => ({draft:await draft(),links:await links(),counts:await query(`select
  (select count(*)::integer from public.box_sets) as boxes,(select count(*)::integer from public.collection_boxes) as copies,
  (select count(*)::integer from public.editions) as editions,(select count(*)::integer from public.collection_items) as items`)});
try {
  await db.exec(`create role anon;create role authenticated;create schema auth;
    create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
    create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text);
    create function storage.foldername(name text) returns text[] language sql immutable as $$select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1]$$;
    create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    grant usage on schema auth to authenticated,anon;grant execute on function auth.uid(),auth.jwt() to authenticated,anon;`);
  for (const file of ['20261008124824_acervo_foundation.sql','20261008192603_edition_cover_storage.sql','20261009143232_copy_photos_and_safe_edition_editing.sql','20261009150017_copy_photo_cover_preference.sql','20261009193901_box_sets.sql','20261010002750_edition_back_cover.sql','20261010021419_edition_cover_types.sql','20261010025750_edition_video_standard.sql','20261012194452_edition_barcode_editing.sql','20261012205822_box_editing.sql']) {
    await db.exec(await readFile(new URL(`../../supabase/migrations/${file}`,import.meta.url),'utf8'));
  }
  await db.query('insert into auth.users(id) values($1),($2)',[a,b]);
  await db.query("insert into public.movies(id,title) values($1,'Alien'),($2,'Aliens'),($3,'Alien 3')",[m1,m2,m3]);
  const file1=`${a}/66666666-6666-4666-8666-666666666666.jpg`,file2=`${a}/77777777-7777-4777-8777-777777777777.png`,foreignFile=`${b}/88888888-8888-4888-8888-888888888888.webp`;
  await db.query("insert into storage.objects(bucket_id,name) values('edition-covers',$1),('edition-covers',$2),('edition-covers',$3)",[file1,file2,foreignFile]);
  const cover1=`https://supabase.test/storage/v1/object/public/edition-covers/${file1}`,cover2=`https://supabase.test/storage/v1/object/public/edition-covers/${file2}`;
  await login(a);
  id=(await query(create,[a,JSON.stringify(minimal),[m1,m2],JSON.stringify(personal)]))[0].id;
  boxId=(await draft()).box_set_id;
  check((await draft()).copy.is_favorite,false); // old clients can still create a box
  const favoriteId=(await query(create,[a,JSON.stringify(minimal),[m1,m2],JSON.stringify({...personal,is_favorite:true})]))[0].id;
  check((await query('select is_favorite from public.collection_boxes where id=$1',[favoriteId]))[0].is_favorite,true);
  for (const favorite of ['true',null,1,{}]) await rejected(create,[a,JSON.stringify(minimal),[m1,m2],JSON.stringify({...personal,is_favorite:favorite})]);
  await rejected(create,[b,JSON.stringify(minimal),[m1,m2],JSON.stringify(personal)],'42501');
  await rejected(create,[a,JSON.stringify({...minimal,created_by:b}),[m1,m2],JSON.stringify(personal)]);
  await rejected(create,[a,JSON.stringify(minimal),[m1,m2],JSON.stringify({...personal,user_id:b})]);

  const old=await draft();
  const values={name:'Alien coleção',barcode:'0001234567890',media_format:'UHD_4K',disc_count:5,publisher:'Warner',country:'Brasil',region:'A',video_standard:'NTSC',edition_name:'Especial',is_special_edition:true,is_limited_edition:true,cover_url:cover1};
  const ownCopy={condition:'SEALED',purchase_price:0,purchase_date:'2026-10-12',purchase_place:'Feira',notes:'Nova nota',is_favorite:true};
  check((await query(edit,await args(values,[m2,m3],ownCopy)))[0].id,id);
  const saved=await draft();
  check(saved.id,id);check(saved.box_set_id,boxId);check(saved.box,values);check(saved.copy,ownCopy);
  check(await links(),[{movie_id:m2,position:1},{movie_id:m3,position:2}]);
  check((await snapshot()).counts,[{boxes:2,copies:2,editions:0,items:0}]);
  await rejected(edit,await args({},[m2,m3],{}, {boxVersion:old.box_version,copyVersion:old.copy_version}),'40001');
  await rejected(edit,await args({},[m2,m3],{}, {boxVersion:old.box_version}),'40001');
  await rejected(edit,await args({},[m2,m3],{}, {copyVersion:old.copy_version}),'40001');
  await rejected(edit,await args({},[m2,m3],{}, {boxId:m1}),'40001');

  // Replace/remove stored covers without deleting storage objects used elsewhere.
  await query(edit,await args({cover_url:cover2},[m2,m3]));check((await draft()).box.cover_url,cover2);
  await query(edit,await args({cover_url:null,barcode:null},[m3,m1],{purchase_price:null,purchase_date:null,purchase_place:'',notes:'',is_favorite:false}));
  check((await draft()).box.cover_url,null);check((await draft()).box.barcode,null);
  check((await draft()).copy,{condition:'SEALED',purchase_price:null,purchase_date:null,purchase_place:null,notes:null,is_favorite:false});
  check(await links(),[{movie_id:m3,position:1},{movie_id:m1,position:2}]);
  await query(edit,await args({barcode:'001234567890'},[m3,m1]));check((await draft()).box.barcode,'001234567890');
  // Omitted optional keys preserve stored favorite and encoding.
  const omitted=await args({},[m3,m1],{is_favorite:true}); await query(edit,omitted);
  const compatible=await args({},[m3,m1]);
  const compatibleBox=JSON.parse(compatible[4]),compatibleCopy=JSON.parse(compatible[6]);
  delete compatibleBox.video_standard;delete compatibleCopy.is_favorite;
  compatible[4]=JSON.stringify(compatibleBox);compatible[6]=JSON.stringify(compatibleCopy);
  await query(edit,compatible);check((await draft()).box.video_standard,'NTSC');check((await draft()).copy.is_favorite,true);

  const before=await snapshot();
  for (const patch of [{name:''},{name:'x'.repeat(201)},{barcode:'123'},{media_format:'BOX'},{disc_count:0},{disc_count:1.5},{is_special_edition:null},{video_standard:'UNKNOWN'},{video_standard:42},{created_by:b},
    {cover_url:'https://outside.test/cover.jpg'},{cover_url:`https://supabase.test/storage/v1/object/public/edition-covers/${foreignFile}`},{cover_url:cover1+'?x=1'},
    {cover_url:`https://supabase.test/storage/v1/object/public/edition-covers/${a}/99999999-9999-4999-8999-999999999999.jpg`}]) {
    await rejected(edit,await args(patch,[m3,m1]));check(await snapshot(),before);
  }
  for (const patch of [{condition:'MINT'},{purchase_price:-1},{purchase_price:'NaN'},{purchase_date:'2026-02-30'},{is_favorite:'true'},{is_favorite:null},{user_id:b},{box_set_id:m1}]) {
    // Invalid copy values must roll back earlier BoxSet and junction updates as well.
    await rejected(edit,await args({name:'Não pode persistir'},[m2,m1],patch));check(await snapshot(),before);
  }
  for (const selection of [[m1],[m1,m1],[m1,null],[m1,'99999999-9999-4999-8999-999999999999'],Array.from({length:101},()=>m1)]) {
    await rejected(edit,await args({},selection));check(await snapshot(),before);
  }
  const forbiddenArgs=await args({},[m3,m1]);
  await rejected('update public.box_sets set name=$1 where id=$2',['Direto',boxId]);
  await rejected('delete from public.box_set_movies where box_set_id=$1',[boxId]);
  await login(b);
  check((await query('select id from public.collection_boxes where id=$1',[id])).length,0);
  check((await query('select id from public.box_sets where id=$1',[boxId])).length,0);
  await rejected(edit,forbiddenArgs,'42501');
  await rejected(edit.replace('public.edit_collection_box','acervo_private.update_collection_box'),forbiddenArgs,'42501');
  await login('', 'anon');await rejected(edit,forbiddenArgs,'42501');await rejected(create,[a,JSON.stringify(minimal),[m1,m2],JSON.stringify(personal)],'42501');
  await login(a,'authenticated',{is_anonymous:true});await rejected(edit,forbiddenArgs,'42501');await rejected(create,[a,JSON.stringify(minimal),[m1,m2],JSON.stringify(personal)],'42501');
  await login(a);check(await snapshot(),before);
  check((await query(`select count(*)::integer as n from pg_class where relname in ('box_sets','box_set_movies','collection_boxes') and relrowsecurity`))[0].n,3);
  await db.exec('reset role');
  const routines=await query(`select n.nspname as schema,p.proname as name,p.prosecdef as definer,p.proconfig as config,
    has_function_privilege('anon',p.oid,'execute') as anon_execute,has_function_privilege('authenticated',p.oid,'execute') as authenticated_execute
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where p.proname in ('edit_collection_box','update_collection_box','create_collection_box','create_collection_box_base') order by p.proname`);
  check(routines.length,4);
  for (const routine of routines) { check(routine.anon_execute,false);check(routine.authenticated_execute,true);check(routine.config,['search_path=""']);check(routine.definer,routine.name==='update_collection_box'); }
  check((await query("select count(*)::integer as n from storage.objects where bucket_id='edition-covers'"))[0].n,3);
  console.log(`Box editing: ${checks} assertivas PostgreSQL/RLS passaram.`);
} finally { await db.close(); }
