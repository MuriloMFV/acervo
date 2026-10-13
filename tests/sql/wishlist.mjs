import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const {PGlite}=await import(process.env.ACERVO_PGLITE_MODULE||'@electric-sql/pglite');
const db=new PGlite();
const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
let checks=0;const query=async(sql,args=[])=> (await db.query(sql,args)).rows;
const check=(actual,expected)=>{assert.deepEqual(actual,expected);checks++;};
const login=async(id,role='authenticated')=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec(`set role ${role}`);};
const denied=async(sql,args=[],code)=>{
 await db.exec('begin;savepoint rejected;');let error;
 try{await db.query(sql,args);}catch(cause){error=cause;}
 await db.exec('rollback to rejected;commit;');check(!!error,true);if(code)check(error.code,code);
};
const insert='insert into public.wishlist_items(user_id,tmdb_id,title) values($1,$2,$3) returning *';
try{
 await db.exec(`create role anon;create role authenticated;create schema auth;
 create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;`);
 for(const file of ['20261008124824_acervo_foundation.sql','20261013133023_wishlist_items.sql']) await db.exec(await readFile(new URL(`../../supabase/migrations/${file}`,import.meta.url),'utf8'));
 await db.query('insert into auth.users(id) values($1),($2)',[a,b]);
 check((await query("select relrowsecurity from pg_class where oid='public.wishlist_items'::regclass"))[0].relrowsecurity,true);
 await login(a);
 const first=(await query(insert,[a,603,'Matrix']))[0];
 check(first.desired_format,'ANY');check(first.priority,'MEDIUM');check(first.status,'LOOKING');check(first.target_price,null);
 await denied(insert,[a,603,'Matrix'], '23505');
 const duplicate=(await query('insert into public.wishlist_items(user_id,tmdb_id,title,duplicate_confirmed) values($1,603,$2,true) returning id',[a,'Matrix']))[0];
 check((await query('select count(*)::integer as n from public.wishlist_items'))[0].n,2);
 await denied('update public.wishlist_items set user_id=$1 where id=$2',[b,first.id],'42501');
 await denied('update public.wishlist_items set tmdb_id=604 where id=$1',[first.id],'42501');
 await denied('update public.wishlist_items set duplicate_confirmed=true where id=$1',[first.id],'42501');
 await query("update public.wishlist_items set desired_format='UHD_4K',priority='HIGH',status='FOUND',target_price=99.90,notes='Edição desejada',listing_url='https://shop.test/item' where id=$1",[first.id]);
 const edited=(await query('select desired_format,priority,status,target_price::text,notes,listing_url from public.wishlist_items where id=$1',[first.id]))[0];
 check(edited,{desired_format:'UHD_4K',priority:'HIGH',status:'FOUND',target_price:'99.90',notes:'Edição desejada',listing_url:'https://shop.test/item'});
 for(const [column,value] of [['desired_format','BOX'],['priority','URGENT'],['status','SOLD'],['listing_url','javascript:alert(1)']])await denied(`update public.wishlist_items set ${column}=$1 where id=$2`,[value,first.id],'23514');
 await denied('update public.wishlist_items set target_price=-1 where id=$1',[first.id],'23514');
 await denied("update public.wishlist_items set target_price='NaN' where id=$1",[first.id],'23514');
 await query("update public.wishlist_items set status='ACQUIRED' where id=$1",[first.id]);
 check((await query('select status from public.wishlist_items where id=$1',[first.id]))[0].status,'ACQUIRED');
 for(const table of ['movies','editions','collection_items'])check((await query(`select count(*)::integer as n from public.${table}`))[0].n,0);
 // Deleting the base copy still requires confirmation while a duplicate survives.
 await query('delete from public.wishlist_items where id=$1',[first.id]);
 await denied(insert,[a,603,'Matrix'],'23505');
 await login(b);
 check((await query('select id from public.wishlist_items where id=$1',[duplicate.id])).length,0);
 check((await query('update public.wishlist_items set notes=$1 where id=$2 returning id',['Invasão',duplicate.id])).length,0);
 check((await query('delete from public.wishlist_items where id=$1 returning id',[duplicate.id])).length,0);
 await denied(insert,[a,604,'Outro filme'],'42501');
 const own=(await query(insert,[b,603,'Matrix']))[0];check(own.user_id,b);
 await login('', 'anon');await denied('select * from public.wishlist_items',[],'42501');await denied(insert,[a,603,'Matrix'],'42501');
 await login(a);
 check((await query('delete from public.wishlist_items where id=$1 returning id',[duplicate.id])).length,1);
 check((await query('select count(*)::integer as n from public.wishlist_items'))[0].n,0);
 await query(insert,[a,603,'Matrix']);
 check((await query('select count(*)::integer as n from public.wishlist_items'))[0].n,1);
 console.log(`Wishlist: ${checks} assertivas PostgreSQL/RLS passaram.`);
}finally{await db.close();}
