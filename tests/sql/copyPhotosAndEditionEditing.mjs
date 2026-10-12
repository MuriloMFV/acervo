// Isolated PostgreSQL/RLS regression; PGlite is a temporary validation tool,
// not an application dependency. See docs/EDITION_BACK_COVER.md for the command.
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
async function denied(sql, values=[], code) {
  await db.exec('begin; savepoint rejected;');
  let rejected=false, rejectedCode;
  try { await db.query(sql,values); } catch (error) { rejected=true; rejectedCode=error.code; }
  await db.exec('rollback to rejected; commit;');
  check(rejected,true);
  if (code) check(rejectedCode,code);
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
  for (const filename of ['20261008124824_acervo_foundation.sql','20261008192603_edition_cover_storage.sql','20261009143232_copy_photos_and_safe_edition_editing.sql','20261009150017_copy_photo_cover_preference.sql','20261009193901_box_sets.sql']) {
    await db.exec(await readFile(new URL(`../../supabase/migrations/${filename}`,import.meta.url),'utf8'));
  }
  await db.query('insert into auth.users(id) values ($1),($2)',[a,b]);
  await db.query("insert into public.movies(id,title,poster_url) values ($1,'Platoon','poster')",[movie]);
  await db.query("insert into public.editions(id,movie_id,barcode,media_format,product_image_url,edition_name) values ($1,$2,'7890552001548','DVD','product','Original')",[edition,movie]);
  await db.query("insert into public.collection_items(id,user_id,edition_id,condition) values ($1,$2,$3,'GOOD'),($4,$5,$3,'GOOD')",[ia,a,edition,ib,b]);
  await db.exec(await readFile(new URL('../../supabase/migrations/20261010002750_edition_back_cover.sql',import.meta.url),'utf8'));
  await db.exec(await readFile(new URL('../../supabase/migrations/20261010021419_edition_cover_types.sql',import.meta.url),'utf8'));
  await db.exec(await readFile(new URL('../../supabase/migrations/20261010025750_edition_video_standard.sql',import.meta.url),'utf8'));
  await db.exec(await readFile(new URL('../../supabase/migrations/20261012194452_edition_barcode_editing.sql',import.meta.url),'utf8'));
  check((await query('select back_cover_url from public.editions where id=$1',[edition]))[0].back_cover_url,null);
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

  // Back cover uses the same immutable Storage objects, never copy-photo data.
  const current=(await query('select edition_id from public.collection_items where id=$1',[ia]))[0].edition_id;
  const backKey=`${a}/77777777-7777-4777-8777-777777777777.png`;
  const nextBackKey=`${a}/88888888-8888-4888-8888-888888888888.webp`;
  for (const name of [backKey,nextBackKey]) await query("insert into storage.objects(bucket_id,name) values ('edition-covers',$1)",[name]);
  await denied("insert into storage.objects(bucket_id,name) values ('edition-covers',$1)",[`${b}/99999999-9999-4999-8999-999999999999.jpg`]);
  check((await query("update storage.objects set name='changed' where bucket_id='edition-covers' and name=$1 returning id",[backKey])).length,0);
  check((await query("delete from storage.objects where bucket_id='edition-covers' and name=$1 returning id",[backKey])).length,0);
  const backUrl=`https://example.supabase.co/storage/v1/object/public/edition-covers/${backKey}`;
  const nextBackUrl=`https://example.supabase.co/storage/v1/object/public/edition-covers/${nextBackKey}`;
  const beforeBack=(await query('select condition,purchase_date,notes,photo_url,use_photo_as_cover from public.collection_items where id=$1',[ia]))[0];
  const withBack=(await query(rpc,[ia,current,JSON.stringify({...fields,back_cover_url:backUrl})]))[0].id;
  check(withBack!==current,true);
  check((await query('select back_cover_url from public.editions where id=$1',[current]))[0].back_cover_url,null);
  check((await query('select back_cover_url,custom_cover_url,product_image_url,barcode,movie_id from public.editions where id=$1',[withBack]))[0],{back_cover_url:backUrl,custom_cover_url:null,product_image_url:'product',barcode:'7890552001548',movie_id:movie});
  check((await query('select condition,purchase_date,notes,photo_url,use_photo_as_cover from public.collection_items where id=$1',[ia]))[0],beforeBack);
  check((await query(rpc,[ia,withBack,JSON.stringify({...fields,back_cover_url:backUrl})]))[0].id,withBack);
  await login(b);
  const sharedCopy=(await query("insert into public.collection_items(user_id,edition_id,condition) values ($1,$2,'GOOD') returning id",[b,withBack]))[0].id;
  await login(a);
  // A legacy payload omitting back_cover_url must keep it, including on a clone.
  check((await query(rpc,[ia,withBack,JSON.stringify(fields)]))[0].id,withBack);
  const legacy=(await query(rpc,[ia,withBack,JSON.stringify({...fields,publisher:'Outra'})]))[0].id;
  check((await query('select back_cover_url from public.editions where id=$1',[legacy]))[0].back_cover_url,backUrl);
  // A front photo uses the same custom-cover field and keeps the existing back.
  const withFrontPhoto=(await query(rpc,[ia,legacy,JSON.stringify({...fields,custom_cover_url:coverUrl,back_cover_url:backUrl})]))[0].id;
  check((await query('select custom_cover_url,back_cover_url from public.editions where id=$1',[withFrontPhoto]))[0],{custom_cover_url:coverUrl,back_cover_url:backUrl});
  check((await query('select poster_url from public.movies where id=$1',[movie]))[0].poster_url,'poster');
  const restoredFront=(await query(rpc,[ia,withFrontPhoto,JSON.stringify({...fields,back_cover_url:backUrl})]))[0].id;
  check((await query('select custom_cover_url,back_cover_url,product_image_url from public.editions where id=$1',[restoredFront]))[0],{custom_cover_url:null,back_cover_url:backUrl,product_image_url:'product'});
  check((await query('select custom_cover_url,back_cover_url from public.editions where id=$1',[withFrontPhoto]))[0],{custom_cover_url:coverUrl,back_cover_url:backUrl});
  const changed=(await query(rpc,[ia,restoredFront,JSON.stringify({...fields,back_cover_url:nextBackUrl})]))[0].id;
  check((await query('select back_cover_url from public.editions where id=$1',[changed]))[0].back_cover_url,nextBackUrl);
  check((await query('select back_cover_url from public.editions where id=$1',[withBack]))[0].back_cover_url,backUrl);
  for (const invalid of ['https://evil.test/back.jpg',backUrl+'?token=external',backUrl.replace(backKey,`${b}/77777777-7777-4777-8777-777777777777.png`),backUrl.replace('77777777-7777-4777-8777-777777777777','99999999-9999-4999-8999-999999999999'),42]) {
    await denied(rpc,[ia,changed,JSON.stringify({...fields,back_cover_url:invalid})]);
  }
  await denied(rpc,[ia,legacy,JSON.stringify({...fields,back_cover_url:null})]);
  await login(b);
  await denied(rpc,[ia,changed,JSON.stringify({...fields,back_cover_url:null})]);
  check((await query('select edition_id from public.collection_items where id=$1',[ib]))[0].edition_id,edition);
  check((await query('select edition_id from public.collection_items where id=$1',[sharedCopy]))[0].edition_id,withBack);
  await login(a,true);
  await denied(rpc,[ia,changed,JSON.stringify({...fields,back_cover_url:null})]);
  await denied("insert into storage.objects(bucket_id,name) values ('edition-covers',$1)",[`${a}/99999999-9999-4999-8999-999999999999.jpg`]);
  await login(a);
  const removed=(await query(rpc,[ia,changed,JSON.stringify({...fields,back_cover_url:null})]))[0].id;
  check((await query('select back_cover_url,custom_cover_url from public.editions where id=$1',[removed]))[0],{back_cover_url:null,custom_cover_url:null});
  check((await query('select back_cover_url from public.editions where id=$1',[changed]))[0].back_cover_url,nextBackUrl);
  check((await query('select name from storage.objects where bucket_id=\'edition-covers\' and name=$1',[nextBackKey])).length,1);
  check((await query('select poster_url from public.movies where id=$1',[movie]))[0].poster_url,'poster');
  check((await query('select condition,purchase_date,notes,photo_url,use_photo_as_cover from public.collection_items where id=$1',[ia]))[0],beforeBack);
  await login(b);
  check((await query('select e.back_cover_url from public.collection_items ci join public.editions e on e.id=ci.edition_id where ci.id=$1',[sharedCopy]))[0].back_cover_url,backUrl);

  // Cover type edits clone only the owned edition and preserve images/barcodes.
  await login(a);
  const types=['STANDARD','SNAPCASE','DIGIPAK','STEELBOOK','SLIPCASE','BOX'];
  check((await query("select enumlabel from pg_enum where enumtypid='public.packaging_type'::regtype order by enumlabel")).map(row=>row.enumlabel),[...types].sort());
  let latest=removed;
  for (const type of types) {
    const previous=latest;
    const currentType=(await query('select packaging_type from public.editions where id=$1',[previous]))[0].packaging_type;
    latest=(await query(rpc,[ia,previous,JSON.stringify({...fields,packaging_type:type,custom_cover_url:coverUrl,back_cover_url:nextBackUrl})]))[0].id;
    check((await query('select packaging_type,country,custom_cover_url,back_cover_url,barcode,movie_id,disc_count from public.editions where id=$1',[latest]))[0],{packaging_type:type,country:'Brasil',custom_cover_url:coverUrl,back_cover_url:nextBackUrl,barcode:'7890552001548',movie_id:movie,disc_count:2});
    check((await query('select packaging_type from public.editions where id=$1',[previous]))[0].packaging_type,currentType);
    check((await query(rpc,[ia,latest,JSON.stringify({...fields,packaging_type:type,custom_cover_url:coverUrl,back_cover_url:nextBackUrl})]))[0].id,latest);
  }
  for (const type of ['', 'CASE', 'OTHER', null, 42]) await denied(rpc,[ia,latest,JSON.stringify({...fields,packaging_type:type})]);
  const olderClientFields={...fields,publisher:'Cliente antigo',custom_cover_url:coverUrl};
  const legacyType=(await query(rpc,[ia,latest,JSON.stringify(olderClientFields)]))[0].id;
  check((await query('select packaging_type,back_cover_url from public.editions where id=$1',[legacyType]))[0],{packaging_type:'BOX',back_cover_url:nextBackUrl});
  check((await query(rpc,[ia,legacyType,JSON.stringify(olderClientFields)]))[0].id,legacyType);
  check((await query('select condition,purchase_date,notes,photo_url,use_photo_as_cover from public.collection_items where id=$1',[ia]))[0],beforeBack);
  check((await query('select poster_url from public.movies where id=$1',[movie]))[0].poster_url,'poster');
  await denied(rpc,[ia,latest,JSON.stringify({...fields,packaging_type:'SNAPCASE'})]);
  await login(b);
  await denied(rpc,[ia,legacyType,JSON.stringify({...fields,packaging_type:'SLIPCASE'})]);
  check((await query('select edition_id from public.collection_items where id=$1',[ib]))[0].edition_id,edition);
  check((await query('select edition_id from public.collection_items where id=$1',[sharedCopy]))[0].edition_id,withBack);
  check((await query('select packaging_type,back_cover_url from public.editions where id=$1',[withBack]))[0],{packaging_type:'STANDARD',back_cover_url:backUrl});
  await login(a,true);
  await denied(rpc,[ia,legacyType,JSON.stringify({...fields,packaging_type:'SNAPCASE'})]);

  // Encoding is independent, copy-on-write, nullable and optional for old APKs.
  await login(a);
  let encoded=legacyType;
  const encodingFields={...olderClientFields,region:'4'};
  for (const encoding of ['NTSC','PAL','PAL-M','SECAM']) {
    const previous=encoded;
    const previousEncoding=(await query('select video_standard from public.editions where id=$1',[previous]))[0].video_standard;
    encoded=(await query(rpc,[ia,previous,JSON.stringify({...encodingFields,video_standard:encoding})]))[0].id;
    check(encoded!==previous,true);
    check((await query('select region,video_standard,back_cover_url,custom_cover_url,packaging_type,barcode from public.editions where id=$1',[encoded]))[0],{region:'4',video_standard:encoding,back_cover_url:nextBackUrl,custom_cover_url:coverUrl,packaging_type:'BOX',barcode:'7890552001548'});
    check((await query('select video_standard from public.editions where id=$1',[previous]))[0].video_standard,previousEncoding);
    check((await query(rpc,[ia,encoded,JSON.stringify({...encodingFields,video_standard:encoding})]))[0].id,encoded);
  }
  for (const encoding of ['', 'UNKNOWN', 42, false, {}]) await denied(rpc,[ia,encoded,JSON.stringify({...encodingFields,video_standard:encoding})]);
  const oldEncodingClient=(await query(rpc,[ia,encoded,JSON.stringify({...encodingFields,publisher:'APK anterior'})]))[0].id;
  check((await query('select video_standard,region from public.editions where id=$1',[oldEncodingClient]))[0],{video_standard:'SECAM',region:'4'});
  const removedEncoding=(await query(rpc,[ia,oldEncodingClient,JSON.stringify({...encodingFields,video_standard:null})]))[0].id;
  check((await query('select video_standard,region from public.editions where id=$1',[removedEncoding]))[0],{video_standard:null,region:'4'});
  check((await query('select video_standard from public.editions where id=$1',[oldEncodingClient]))[0].video_standard,'SECAM');
  check((await query('select condition,purchase_date,notes,photo_url,use_photo_as_cover from public.collection_items where id=$1',[ia]))[0],beforeBack);
  check((await query('select poster_url from public.movies where id=$1',[movie]))[0].poster_url,'poster');
  await denied("insert into public.editions(movie_id,media_format,video_standard) values ($1,'DVD','UNKNOWN')",[movie]);
  await login(b);
  await denied(rpc,[ia,removedEncoding,JSON.stringify({...encodingFields,video_standard:'PAL'})]);
  check((await query('select edition_id from public.collection_items where id=$1',[sharedCopy]))[0].edition_id,withBack);
  check((await query('select video_standard from public.editions where id=$1',[withBack]))[0].video_standard,null);
  await login(a,true);
  await denied(rpc,[ia,removedEncoding,JSON.stringify({...encodingFields,video_standard:'NTSC'})]);
  // Barcode-aware forms edit the same Edition atomically; legacy tests above
  // still exercise the previous copy-on-write path through the same public RPC.
  await login(a);
  const barcodeEdition=(await query('select * from public.editions where id=$1',[removedEncoding]))[0];
  const barcodeFields={edition_name:barcodeEdition.edition_name,publisher:barcodeEdition.publisher,
    country:barcodeEdition.country,region:barcodeEdition.region,disc_count:barcodeEdition.disc_count,
    custom_cover_url:barcodeEdition.custom_cover_url,back_cover_url:barcodeEdition.back_cover_url,
    packaging_type:barcodeEdition.packaging_type,video_standard:barcodeEdition.video_standard};
  const editionCount=async()=>(await query('select count(*)::integer as n from public.editions'))[0].n;
  const editionSnapshot=async()=>(await query("select to_jsonb(e)-'updated_at' as data from public.editions e where id=$1",[removedEncoding]))[0].data;
  const stamp=async()=>(await query('select updated_at::text as value from public.editions where id=$1',[removedEncoding]))[0].value;
  const currentFields=async(barcode)=>({...barcodeFields,barcode,expected_updated_at:await stamp()});
  const beforeCount=await editionCount();
  const beforeBarcode=await editionSnapshot();
  const beforeCopy=(await query('select to_jsonb(ci) as data from public.collection_items ci where id=$1',[ia]))[0].data;
  // Another copy owned by the same user keeps its Edition link.
  const sameUserCopy=(await query("insert into public.collection_items(user_id,edition_id,condition) values ($1,$2,'SEALED') returning id",[a,removedEncoding]))[0].id;
  for (const [value,expected] of [[null,null],[' EAN: 0012-3456-78905 ','0012345678905'],['012345678905','012345678905'],['96385074','96385074'],[null,null]]) {
    check((await query(rpc,[ia,removedEncoding,JSON.stringify(await currentFields(value))]))[0].id,removedEncoding);
    check(await editionCount(),beforeCount);
    check(await editionSnapshot(),{...beforeBarcode,barcode:expected});
    check((await query('select to_jsonb(ci) as data from public.collection_items ci where id=$1',[ia]))[0].data,beforeCopy);
    check((await query('select edition_id from public.collection_items where id=$1',[sameUserCopy]))[0].edition_id,removedEncoding);
  }
  for (const barcode of ['1234567','123456789','00123456789056','text','---',42,[],{}]) {
    await denied(rpc,[ia,removedEncoding,JSON.stringify(await currentFields(barcode))],'22023');
  }
  await denied(rpc,[ia,removedEncoding,JSON.stringify({...await currentFields('96385074'),movie_id:movie})],'22023');
  for (const invalid of [{custom_cover_url:'https://external.test/front.jpg'}, {back_cover_url:'https://external.test/back.jpg'}, {custom_cover_url:coverUrl.replace(coverKey,`${b}/66666666-6666-4666-8666-666666666666.jpg`)}, {packaging_type:'OTHER'}, {video_standard:'UNKNOWN'}]) {
    await denied(rpc,[ia,removedEncoding,JSON.stringify({...await currentFields('96385074'),...invalid})],'22023');
  }
  const {expected_updated_at:omitted,...missingStamp}=await currentFields('96385074');
  await denied(rpc,[ia,removedEncoding,JSON.stringify(missingStamp)],'22023');
  const staleBarcodeFields=await currentFields('96385074');
  check((await query(rpc,[ia,removedEncoding,JSON.stringify(staleBarcodeFields)]))[0].id,removedEncoding);
  await denied(rpc,[ia,removedEncoding,JSON.stringify({...staleBarcodeFields,barcode:'012345678905'})],'40001');
  await denied(rpc,[ia,edition,JSON.stringify(await currentFields('012345678905'))],'40001');
  // Barcode and explicitly changed metadata stay on the current row in one write.
  const editFields={...await currentFields('012345678905'),publisher:'Sony',country:'Japão'};
  check((await query(rpc,[ia,removedEncoding,JSON.stringify(editFields)]))[0].id,removedEncoding);
  check(await editionSnapshot(),{...beforeBarcode,barcode:'012345678905',publisher:'Sony',country:'Japão'});
  check(await editionCount(),beforeCount);
  await denied("update public.editions set barcode='96385074' where id=$1",[removedEncoding],'42501');
  await denied(rpc,[ib,edition,JSON.stringify(editFields)],'42501');
  await denied('select acervo_private.update_collection_edition_current($1,$2,$3::jsonb)',[ib,edition,JSON.stringify(editFields)],'42501');
  // RLS hides other users' copies, so sharing protection must check globally.
  await login(b);
  await query("insert into public.collection_items(user_id,edition_id,condition) values ($1,$2,'GOOD')",[b,removedEncoding]);
  await login(a);
  const sharedFields={...await currentFields('96385074'),publisher:'Sony',country:'Japão'};
  await denied(rpc,[ia,removedEncoding,JSON.stringify(sharedFields)],'55000');
  check(await editionCount(),beforeCount);
  check((await query('select barcode from public.editions where id=$1',[removedEncoding]))[0].barcode,'012345678905');
  check((await query('select to_jsonb(ci) as data from public.collection_items ci where id=$1',[ia]))[0].data,beforeCopy);
  // An unchanged shared edition may be saved safely, without cloning it.
  check((await query(rpc,[ia,removedEncoding,JSON.stringify({...sharedFields,barcode:'012345678905'})]))[0].id,removedEncoding);
  await login(a,true);
  await denied(rpc,[ia,removedEncoding,JSON.stringify(sharedFields)],'42501');
  await login('');
  await denied(rpc,[ia,removedEncoding,JSON.stringify(sharedFields)],'42501');
  await db.exec('reset role');
  // Local security audit: only the private guarded updater is privileged.
  check((await query("select prosecdef from pg_proc where oid='public.edit_collection_edition(uuid,uuid,jsonb)'::regprocedure"))[0].prosecdef,false);
  check((await query("select prosecdef from pg_proc where oid='acervo_private.update_collection_edition_current(uuid,uuid,jsonb)'::regprocedure"))[0].prosecdef,true);
  check((await query("select proconfig from pg_proc where oid='acervo_private.update_collection_edition_current(uuid,uuid,jsonb)'::regprocedure"))[0].proconfig,['search_path=""']);
  check((await query("select has_table_privilege('authenticated','public.editions','UPDATE') as allowed"))[0].allowed,false);
  for (const fn of ['public.edit_collection_edition','acervo_private.update_collection_edition_current','acervo_private.clone_collection_edition']) {
    check((await query('select has_function_privilege($1,$2,$3) as allowed',['anon',`${fn}(uuid,uuid,jsonb)`,'EXECUTE']))[0].allowed,false);
    check((await query('select has_function_privilege($1,$2,$3) as allowed',['authenticated',`${fn}(uuid,uuid,jsonb)`,'EXECUTE']))[0].allowed,true);
  }
  await db.exec('reset role; set role anon');
  await denied(rpc,[ia,cloned,JSON.stringify(fields)]);
  console.log(`Migration + RLS: ${checks} assertions passed (isolated PostgreSQL, two owners and anonymous roles).`);
} finally { await db.close(); }
